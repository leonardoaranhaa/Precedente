import { withCircuitBreaker } from "../circuit-breaker";

/**
 * Preço "vivo" pro cabeçalho do resultado — só isso, sem OHLC, sem
 * indicadores. Mesma dupla de bases e mesmo circuit breaker de
 * exchange.ts, mas isolado num arquivo próprio: é uma chamada muito mais
 * leve (ticker/price, não klines) e não deve competir pelo mesmo breaker
 * que o fetch de OHLC — uma falha aqui não deve abrir o circuito do motor
 * de análise, e vice-versa.
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

// Cache curtíssimo em memória — se vários clientes pedirem o mesmo símbolo
// quase ao mesmo tempo (poll de vários usuários olhando o mesmo par), não
// vale a pena pagar uma chamada à Binance por request.
const CACHE_TTL_MS = 2_000;
const cache = new Map<string, { price: number; at: number }>();

async function fetchFromBase(base: string, symbol: string): Promise<number> {
  const url = new URL(`${base}/api/v3/ticker/price`);
  url.searchParams.set("symbol", symbol);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
  });
  if (res.status === 400) {
    throw new Error(`Par ${symbol} não encontrado na Binance.`);
  }
  if (!res.ok) {
    throw new Error(`Binance indisponível (${res.status}).`);
  }
  const body = (await res.json()) as { price?: string };
  const price = Number(body.price);
  if (!Number.isFinite(price)) {
    throw new Error("Resposta inesperada da Binance.");
  }
  return price;
}

async function fetchLivePriceUnguarded(symbol: string): Promise<number> {
  let lastError: Error | null = null;
  for (const base of BASES) {
    try {
      return await fetchFromBase(base, symbol);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes("não encontrado")) throw lastError;
    }
  }
  throw lastError ?? new Error("Não foi possível ler a Binance agora.");
}

export async function fetchLivePrice(symbol: string): Promise<number> {
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.price;

  const price = await withCircuitBreaker("binance-live-price", BREAKER_OPTS, () =>
    fetchLivePriceUnguarded(symbol),
  );
  cache.set(symbol, { price, at: Date.now() });
  return price;
}
