/**
 * Detecção de novas listagens na Binance (spot USDT).
 *
 * Mantém em memória o conjunto de symbols conhecidos e o timestamp de
 * primeira aparição de cada um. A cada fetch, compara com o snapshot
 * anterior e marca como "nova" qualquer moeda que apareceu nas últimas
 * 72h. No primeiro boot (sem baseline), todos os pares são registrados
 * sem serem marcados como novos.
 */

import { withCircuitBreaker } from "../circuit-breaker.ts";

const BASES = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
] as const;

const NEW_WINDOW_MS = 72 * 60 * 60 * 1000; // 72h
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 min

const PEGGED = new Set([
  "USDC", "FDUSD", "TUSD", "BUSD", "USD1", "RLUSD", "USDP",
  "PYUSD", "USDE", "DAI", "AEUR", "EUR", "GBP", "TRY", "BRL",
  "ARS", "JPY", "PAX",
]);

const LEVERAGED = /(UP|DOWN|BULL|BEAR)USDT$/;

export type NewListingRow = {
  symbol: string;
  base: string;
  lastPrice: number;
  changePct: number;
  quoteVolume: number;
  high: number;
  low: number;
  firstSeenAt: number;
  ageHours: number;
};

export type NewListingsSnapshot = {
  fetchedAt: number;
  source: string;
  listings: NewListingRow[];
  totalTracked: number;
  disclaimer: string;
};

type BinanceTicker = {
  symbol?: string;
  lastPrice?: string;
  priceChangePercent?: string;
  quoteVolume?: string;
  highPrice?: string;
  lowPrice?: string;
};

const knownSymbols = new Map<string, number>();
let initialized = false;
let cache: { snap: NewListingsSnapshot; at: number } | null = null;

function num(v: unknown): number {
  const n = typeof v === "string" || typeof v === "number" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function baseFromSymbol(s: string): string {
  return s.endsWith("USDT") && s.length > 4 ? s.slice(0, -4) : s;
}

function isValidPair(symbol: string): boolean {
  if (!symbol.endsWith("USDT")) return false;
  if (symbol.includes("_")) return false;
  if (LEVERAGED.test(symbol)) return false;
  const base = baseFromSymbol(symbol);
  return !PEGGED.has(base);
}

async function fetchAllTickers(base: string): Promise<BinanceTicker[]> {
  const res = await fetch(`${base}/api/v3/ticker/24hr`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Binance ticker/24hr ${res.status}`);
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) throw new Error("Resposta inesperada ticker/24hr");
  return data as BinanceTicker[];
}

export async function fetchNewListings(): Promise<NewListingsSnapshot> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.snap;
  }

  const snap = await withCircuitBreaker(
    "new-listings",
    { failureThreshold: 4, cooldownMs: 60_000 },
    async () => {
      let lastErr: Error | null = null;
      let raw: BinanceTicker[] = [];
      let source: string = BASES[0];
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

      const now = Date.now();
      const currentSymbols = new Set<string>();
      const tickerMap = new Map<string, BinanceTicker>();

      for (const t of raw) {
        const sym = String(t.symbol ?? "");
        if (!isValidPair(sym)) continue;
        if (num(t.lastPrice) <= 0) continue;
        currentSymbols.add(sym);
        tickerMap.set(sym, t);
      }

      if (!initialized) {
        for (const sym of currentSymbols) {
          knownSymbols.set(sym, now - NEW_WINDOW_MS - 1);
        }
        initialized = true;
      }

      for (const sym of currentSymbols) {
        if (!knownSymbols.has(sym)) {
          knownSymbols.set(sym, now);
        }
      }

      // Remove symbols not seen in 7 days to prevent unbounded growth
      const CLEANUP_MS = 7 * 24 * 60 * 60 * 1000;
      for (const [sym] of knownSymbols) {
        if (!currentSymbols.has(sym) && now - knownSymbols.get(sym)! > CLEANUP_MS) {
          knownSymbols.delete(sym);
        }
      }

      const listings: NewListingRow[] = [];
      for (const [sym, firstSeen] of knownSymbols) {
        const age = now - firstSeen;
        if (age > NEW_WINDOW_MS) continue;
        const t = tickerMap.get(sym);
        if (!t) continue;
        listings.push({
          symbol: sym,
          base: baseFromSymbol(sym),
          lastPrice: num(t.lastPrice),
          changePct: num(t.priceChangePercent),
          quoteVolume: num(t.quoteVolume),
          high: num(t.highPrice),
          low: num(t.lowPrice),
          firstSeenAt: firstSeen,
          ageHours: Math.round(age / (60 * 60 * 1000) * 10) / 10,
        });
      }

      listings.sort((a, b) => b.firstSeenAt - a.firstSeenAt);

      return {
        fetchedAt: now,
        source,
        listings,
        totalTracked: knownSymbols.size,
        disclaimer: "Novas listagens detectadas por comparação de snapshots. A primeira execução após restart do servidor não detecta listagens anteriores.",
      } satisfies NewListingsSnapshot;
    },
  );

  cache = { snap, at: Date.now() };
  return snap;
}

export function clearNewListingsCache(): void {
  cache = null;
}
