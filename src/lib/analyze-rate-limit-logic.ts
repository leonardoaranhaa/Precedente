import { checkRateLimit, RateLimitError } from "./rate-limit.ts";

/**
 * Vision reads cost a paid Anthropic (Opus) call; plain OHLC analysis only
 * costs a Binance/DexScreener fetch. Separate, much stricter, buckets for
 * the two so a burst of free OHLC lookups never eats into or trips the
 * vision quota, and vice versa.
 */
export const OHLC_LIMIT = 20;
export const VISION_LIMIT = 6;
export const WINDOW_MS = 5 * 60 * 1000;

export function analyzeBucketKey(hasImage: boolean, ip: string): string {
  return `analyze:${hasImage ? "vision" : "ohlc"}:${ip}`;
}

/** Throws `RateLimitError` once the caller's quota for this call type is spent. */
export function assertAnalyzeQuota(hasImage: boolean, ip: string): void {
  const limit = hasImage ? VISION_LIMIT : OHLC_LIMIT;
  const result = checkRateLimit(analyzeBucketKey(hasImage, ip), limit, WINDOW_MS);
  if (!result.allowed) {
    throw new RateLimitError("Muitas análises em pouco tempo. Tente de novo em instantes.");
  }
}
