import { withCircuitBreaker } from "../circuit-breaker";
import type { Timeframe } from "./types";

/**
 * Série curta de fechamentos pro comparador lado a lado — não é o motor de
 * análise (sem indicadores, sem precedentes), só o suficiente pra desenhar
 * uma sparkline. Circuit breaker próprio, isolado do de OHLC/live-price:
 * uma falha aqui não deve abrir os outros circuitos, e vice-versa.
 */
const BASES = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
] as const;

const BREAKER_OPTS = {
  failureThreshold: 5,
  cooldownMs: 20_000,
  isFailure: (err: unknown) => !(err instanceof Error && err.message.includes("não encontrado")),
};

const LIMIT = 60;

async function fetchFromBase(base: string, symbol: string, interval: Timeframe): Promise<number[]> {
  const url = new URL(`${base}/api/v3/klines`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(LIMIT));
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(6_000),
  });
  if (res.status === 400) {
    throw new Error(`Par ${symbol} não encontrado na Binance.`);
  }
  if (!res.ok) {
    throw new Error(`Binance indisponível (${res.status}).`);
  }
  const raw = (await res.json()) as unknown[][];
  if (!Array.isArray(raw)) {
    throw new Error("Resposta inesperada da Binance.");
  }
  return raw.map((row) => Number(row[4])).filter(Number.isFinite);
}

async function fetchSparklineUnguarded(symbol: string, interval: Timeframe): Promise<number[]> {
  let lastError: Error | null = null;
  for (const base of BASES) {
    try {
      return await fetchFromBase(base, symbol, interval);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes("não encontrado")) throw lastError;
    }
  }
  throw lastError ?? new Error("Não foi possível ler a Binance agora.");
}

export function fetchSparkline(symbol: string, interval: Timeframe): Promise<number[]> {
  return withCircuitBreaker("binance-sparkline", BREAKER_OPTS, () =>
    fetchSparklineUnguarded(symbol, interval),
  );
}
