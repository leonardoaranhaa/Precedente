/**
 * Helpers de símbolo compartilhados entre a camada de derivativos (Binance)
 * e a camada DEX. Puro, sem I/O.
 */

const QUOTES = ["USDT", "USDC", "BUSD", "FDUSD", "BRL"] as const;

/** "PEPEUSDT" → "PEPE". Símbolo sem quote conhecida volta inalterado. */
export function baseAsset(symbol: string): string {
  const s = symbol.toUpperCase();
  for (const q of QUOTES) {
    if (s.endsWith(q) && s.length > q.length) return s.slice(0, -q.length);
  }
  return s;
}
