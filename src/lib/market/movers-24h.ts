/**
 * Maiores movimentações 24h na Binance (spot USDT) — só fatos de mercado.
 * Não interpreta "bom/ruim" como trade; só variação, volume e sessão
 * (fechou acima/abaixo da abertura do período 24h do ticker).
 */

import { withCircuitBreaker } from "../circuit-breaker.ts";

const BASES = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
] as const;

export type MoverRow = {
  symbol: string;
  /** Ex.: BTC */
  base: string;
  lastPrice: number;
  /** Variação % nas últimas 24h (ticker Binance). */
  changePct: number;
  /** Volume na moeda base (ex.: BTC). */
  volumeBase: number;
  /** Volume cotado em USDT. */
  quoteVolume: number;
  high: number;
  low: number;
  open: number;
  /** "acima" se last >= open, senão "abaixo" — sessão 24h do ticker, não julgamento de trade. */
  session: "acima" | "abaixo" | "lateral";
  /** Amplitude (high-low)/open em %. */
  rangePct: number;
};

export type MoversSnapshot = {
  fetchedAt: number;
  source: string;
  /** Top por |changePct| (oscilação). */
  byAbsChange: MoverRow[];
  /** Top por quoteVolume. */
  byQuoteVolume: MoverRow[];
  /** Maiores altas % (changePct > 0). */
  gainers: MoverRow[];
  /** Maiores baixas % (changePct < 0). */
  losers: MoverRow[];
  disclaimer: string;
};

export const MOVERS_DISCLAIMER =
  "Resumo factual 24h (Binance spot USDT). Volume e variação não são sinal de entrada/saída nem julgamento de trade.";

type BinanceTicker24h = {
  symbol?: string;
  lastPrice?: string;
  priceChangePercent?: string;
  volume?: string;
  quoteVolume?: string;
  highPrice?: string;
  lowPrice?: string;
  openPrice?: string;
};

const CACHE_TTL_MS = 3 * 60 * 1000;
let cache: { snap: MoversSnapshot; at: number } | null = null;

function num(v: unknown): number {
  const n = typeof v === "string" || typeof v === "number" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function baseFromSymbol(symbol: string): string {
  if (symbol.endsWith("USDT") && symbol.length > 4) return symbol.slice(0, -4);
  return symbol;
}

function sessionOf(open: number, last: number): MoverRow["session"] {
  if (!(open > 0) || !(last > 0)) return "lateral";
  const d = ((last - open) / open) * 100;
  if (Math.abs(d) < 0.05) return "lateral";
  return last >= open ? "acima" : "abaixo";
}

function toRow(t: BinanceTicker24h): MoverRow | null {
  const symbol = String(t.symbol ?? "");
  if (!symbol.endsWith("USDT")) return null;
  if (symbol.includes("_") || symbol.endsWith("UPUSDT") || symbol.endsWith("DOWNUSDT")) return null;
  const open = num(t.openPrice);
  const last = num(t.lastPrice);
  const high = num(t.highPrice);
  const low = num(t.lowPrice);
  const changePct = num(t.priceChangePercent);
  const volumeBase = num(t.volume);
  const quoteVolume = num(t.quoteVolume);
  if (!(last > 0) || !(quoteVolume > 0)) return null;
  const rangePct = open > 0 ? ((high - low) / open) * 100 : 0;
  return {
    symbol,
    base: baseFromSymbol(symbol),
    lastPrice: last,
    changePct,
    volumeBase,
    quoteVolume,
    high,
    low,
    open,
    session: sessionOf(open, last),
    rangePct,
  };
}

async function fetchAllTickers(base: string): Promise<BinanceTicker24h[]> {
  const url = `${base}/api/v3/ticker/24hr`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Binance ticker/24hr ${res.status}`);
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) throw new Error("Resposta inesperada ticker/24hr");
  return data as BinanceTicker24h[];
}

export type MoversOptions = {
  top?: number;
  minQuoteVolume?: number;
};

export async function fetchMovers24h(opts: MoversOptions = {}): Promise<MoversSnapshot> {
  const top = opts.top ?? 5;
  const minQ = opts.minQuoteVolume ?? 1_000_000;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.snap;
  }

  const snap = await withCircuitBreaker(
    "movers-24h",
    { failureThreshold: 4, cooldownMs: 60_000 },
    async () => {
      let lastErr: Error | null = null;
      let raw: BinanceTicker24h[] = [];
      let source = BASES[0];
      for (const base of BASES) {
        try {
          raw = await fetchAllTickers(base);
          source = base.includes("data-api") ? "Binance data-api" : "Binance";
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error(String(e));
        }
      }
      if (lastErr && raw.length === 0) throw lastErr;

      const rows = raw.map(toRow).filter((r): r is MoverRow => r != null);
      const liquid = rows.filter((r) => r.quoteVolume >= minQ);

      const byAbsChange = [...liquid]
        .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
        .slice(0, top);
      const byQuoteVolume = [...rows].sort((a, b) => b.quoteVolume - a.quoteVolume).slice(0, top);
      const gainers = [...liquid]
        .filter((r) => r.changePct > 0)
        .sort((a, b) => b.changePct - a.changePct)
        .slice(0, top);
      const losers = [...liquid]
        .filter((r) => r.changePct < 0)
        .sort((a, b) => a.changePct - b.changePct)
        .slice(0, top);

      return {
        fetchedAt: Date.now(),
        source,
        byAbsChange,
        byQuoteVolume,
        gainers,
        losers,
        disclaimer: MOVERS_DISCLAIMER,
      } satisfies MoversSnapshot;
    },
  );

  cache = { snap, at: Date.now() };
  return snap;
}

function fmtPct(n: number): string {
  const s = n.toFixed(1).replace(".", ",");
  return `${n >= 0 ? "+" : ""}${s}%`;
}

function fmtQuoteVol(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function formatMoversForPush(snap: MoversSnapshot, maxLines = 6): string {
  const lines: string[] = [];
  lines.push("Movers 24h (volume USDT):");
  for (const r of snap.byQuoteVolume.slice(0, 3)) {
    lines.push(
      `· ${r.base} ${fmtPct(r.changePct)} vol ${fmtQuoteVol(r.quoteVolume)} sessão ${r.session}`,
    );
  }
  if (snap.gainers[0] || snap.losers[0]) {
    lines.push("Oscilação (líquidos):");
    if (snap.gainers[0]) {
      const g = snap.gainers[0];
      lines.push(`· alta ${g.base} ${fmtPct(g.changePct)} range ${g.rangePct.toFixed(1).replace(".", ",")}%`);
    }
    if (snap.losers[0]) {
      const l = snap.losers[0];
      lines.push(`· baixa ${l.base} ${fmtPct(l.changePct)} range ${l.rangePct.toFixed(1).replace(".", ",")}%`);
    }
  }
  return lines.slice(0, maxLines).join("\n");
}

export function clearMoversCache(): void {
  cache = null;
}
