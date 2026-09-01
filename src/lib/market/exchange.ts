import type { Candle, Timeframe } from "./types";

const BASES = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
] as const;

const INTERVAL_MS: Record<Timeframe, number> = {
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

const TARGET_BARS = 1500;
const PAGE = 1000;

type Kline = [
  number,
  string,
  string,
  string,
  string,
  string,
  ...unknown[],
];

function parseKline(row: Kline): Candle {
  return {
    t: row[0],
    o: Number(row[1]),
    h: Number(row[2]),
    l: Number(row[3]),
    c: Number(row[4]),
    v: Number(row[5]),
  };
}

async function fetchPage(
  base: string,
  symbol: string,
  interval: Timeframe,
  startTime: number,
): Promise<Candle[]> {
  const url = new URL(`${base}/api/v3/klines`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(PAGE));
  url.searchParams.set("startTime", String(startTime));

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });

  if (res.status === 400) {
    throw new Error(`Par ${symbol} não encontrado na Binance. Confira o ticker.`);
  }
  if (!res.ok) {
    throw new Error(`Binance indisponível (${res.status}). Tente de novo em instantes.`);
  }

  const raw = (await res.json()) as Kline[];
  if (!Array.isArray(raw)) {
    throw new Error("Resposta inesperada da Binance.");
  }
  return raw.map(parseKline);
}

export async function fetchOHLCV(
  symbol: string,
  interval: Timeframe,
): Promise<{ candles: Candle[]; source: string }> {
  let lastError: Error | null = null;

  for (const base of BASES) {
    try {
      const ms = INTERVAL_MS[interval];
      const start = Date.now() - TARGET_BARS * ms;
      const first = await fetchPage(base, symbol, interval, start);
      if (first.length === 0) {
        throw new Error(`Sem candles para ${symbol} neste tempo gráfico.`);
      }

      const candles = first;
      if (first.length === PAGE) {
        const nextStart = first[first.length - 1]!.t + ms;
        const second = await fetchPage(base, symbol, interval, nextStart);
        const seen = new Set(candles.map((c) => c.t));
        for (const c of second) {
          if (!seen.has(c.t)) candles.push(c);
        }
      }

      candles.sort((a, b) => a.t - b.t);
      return { candles, source: "Binance" };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes("não encontrado")) throw lastError;
    }
  }

  throw lastError ?? new Error("Não foi possível ler a Binance agora.");
}
