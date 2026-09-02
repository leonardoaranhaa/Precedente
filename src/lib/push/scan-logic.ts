import type { Timeframe } from "@/lib/market/types";

export type WatchPair = { ticker: string; timeframe: Timeframe };

export function pairKey(ticker: string, timeframe: string): string {
  return `${ticker}:${timeframe}`;
}

/**
 * Dedup watches across every subscription by (ticker, timeframe). Many
 * subscriptions commonly watch the same popular pair — without this, a scan
 * with 50 subscriptions × 10 pairs re-analyzes the same pair up to 50 times
 * in series instead of once.
 */
export function uniqueWatchPairs(subs: { watches: readonly WatchPair[] }[]): WatchPair[] {
  const seen = new Map<string, WatchPair>();
  for (const sub of subs) {
    for (const w of sub.watches) {
      seen.set(pairKey(w.ticker, w.timeframe), w);
    }
  }
  return [...seen.values()];
}
