/**
 * Fixed-window rate limiter, in-memory per process. The app runs as one
 * long-lived Node process (Railway), so this actually holds across requests
 * — it just does not share state across multiple instances/replicas. That
 * tradeoff is fine here: the goal is blocking a single script hammering a
 * paid endpoint (Anthropic vision, Binance), not perfect multi-instance
 * fairness.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Buckets accumulate one entry per distinct key seen; without a cap a
// sustained flood from rotating IPs would grow this map unbounded.
const MAX_BUCKETS = 5000;

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

/** Thrown by call sites that enforce a rate limit outside a plain REST handler. */
export class RateLimitError extends Error {
  readonly status = 429;
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS && !existing) {
      // Drop the oldest-looking entry rather than let the map grow forever.
      const firstKey = buckets.keys().next().value;
      if (firstKey !== undefined) buckets.delete(firstKey);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true };
}

/**
 * Best-effort client IP from proxy headers. Confirmed against Railway's
 * actual edge (via a live header dump): it writes `x-forwarded-for` as
 * `<railway-edge-ip>, <ip that connected to the edge>` — its own hop
 * FIRST, not appended last like the conventional reading of the header
 * assumes. `x-real-ip` mirrors that same first (edge) value, so it is not
 * useful here either. Taking the first entry, or `x-real-ip`, keys every
 * request by Railway's small rotating edge-node pool instead of the
 * client — which silently defeats the whole rate limiter (every caller
 * looks like a handful of different "clients"). The last entry is the
 * one actually worth keying on.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim());
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
