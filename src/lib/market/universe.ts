import { displayTicker } from "./labels";

const BASES = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
] as const;

/**
 * Pares onde o ativo base também é dólar (ou moeda fiduciária): giram volume
 * altíssimo e não dizem nada sobre especulação — sairiam no topo de qualquer
 * ranking por volume e empurrariam para fora o que interessa.
 */
const PEGGED = new Set([
  "USDC",
  "FDUSD",
  "TUSD",
  "BUSD",
  "USD1",
  "RLUSD",
  "USDP",
  "PYUSD",
  "USDE",
  "DAI",
  "AEUR",
  "EUR",
  "GBP",
  "TRY",
  "BRL",
  "ARS",
  "JPY",
  "PAX",
]);

/** Tokens alavancados da própria corretora — preço é derivado, não mercado. */
const LEVERAGED = /(UP|DOWN|BULL|BEAR)USDT$/;

export type TradedPair = {
  symbol: string;
  display: string;
  base: string;
  lastPrice: number;
  changePct: number;
  quoteVolume: number;
};

type Ticker24h = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
};

function baseAsset(symbol: string): string {
  return symbol.slice(0, -"USDT".length);
}

/**
 * Os pares USDT mais negociados nas últimas 24h, por volume em dólar.
 * Sem chave de API — mesmo endpoint público que serve o OHLC.
 */
export async function fetchTopTraded(limit = 12): Promise<TradedPair[]> {
  let lastError: Error | null = null;

  for (const base of BASES) {
    try {
      const res = await fetch(`${base}/api/v3/ticker/24hr`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) {
        throw new Error(`Binance indisponível (${res.status}).`);
      }
      const raw = (await res.json()) as Ticker24h[];
      if (!Array.isArray(raw)) {
        throw new Error("Resposta inesperada da Binance.");
      }

      return raw
        .filter((t) => t.symbol.endsWith("USDT"))
        .filter((t) => !LEVERAGED.test(t.symbol))
        .filter((t) => !PEGGED.has(baseAsset(t.symbol)))
        .map((t) => ({
          symbol: t.symbol,
          display: displayTicker(t.symbol),
          base: baseAsset(t.symbol),
          lastPrice: Number(t.lastPrice),
          changePct: Number(t.priceChangePercent),
          quoteVolume: Number(t.quoteVolume),
        }))
        .filter((t) => Number.isFinite(t.quoteVolume) && t.quoteVolume > 0)
        .sort((a, b) => b.quoteVolume - a.quoteVolume)
        .slice(0, limit);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error("Não foi possível ler o volume da Binance agora.");
}
