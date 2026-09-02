/**
 * In-memory circuit breaker, per process — same tradeoff as rate-limit.ts:
 * holds across requests on this one Railway instance, doesn't share state
 * across replicas. Goal here isn't perfect distributed state, it's stopping
 * every concurrent request from individually paying the full timeout while
 * an external API (Binance, Anthropic) is down.
 *
 * Classic 3-state breaker, simplified: "closed" (normal), "open" (fails
 * fast without calling out), and an implicit half-open probe once the
 * cooldown elapses — one call is allowed through; success closes it again,
 * failure re-opens with a fresh cooldown. No exclusivity on the probe (a
 * few concurrent requests may all probe at once right after cooldown) —
 * an acceptable simplification at this scale.
 */

type BreakerState = {
  state: "closed" | "open";
  consecutiveFailures: number;
  openedAt: number;
};

export type BreakerOptions = {
  /** Consecutive failures before the breaker trips open. */
  failureThreshold: number;
  /** How long it stays open before allowing a probe call through. */
  cooldownMs: number;
  /**
   * Decides whether a thrown error counts as a service failure (default:
   * every throw does). Use this to exclude expected, per-request errors —
   * "ticker not found" isn't Binance being down, it shouldn't trip the
   * breaker or reset its cooldown.
   */
  isFailure?: (err: unknown) => boolean;
};

const breakers = new Map<string, BreakerState>();

export class CircuitOpenError extends Error {
  readonly status = 503;
  constructor(name: string, retryAfterSec: number) {
    super(`${name} indisponível no momento — tente de novo em ${retryAfterSec}s.`);
    this.name = "CircuitOpenError";
  }
}

function getState(name: string): BreakerState {
  let s = breakers.get(name);
  if (!s) {
    s = { state: "closed", consecutiveFailures: 0, openedAt: 0 };
    breakers.set(name, s);
  }
  return s;
}

export async function withCircuitBreaker<T>(
  name: string,
  opts: BreakerOptions,
  fn: () => Promise<T>,
): Promise<T> {
  const s = getState(name);

  if (s.state === "open") {
    const elapsed = Date.now() - s.openedAt;
    if (elapsed < opts.cooldownMs) {
      throw new CircuitOpenError(name, Math.ceil((opts.cooldownMs - elapsed) / 1000));
    }
    // Cooldown elapsed: fall through and let this call probe the breaker.
  }

  try {
    const result = await fn();
    s.state = "closed";
    s.consecutiveFailures = 0;
    return result;
  } catch (err) {
    if (opts.isFailure && !opts.isFailure(err)) throw err;
    s.consecutiveFailures += 1;
    if (s.consecutiveFailures >= opts.failureThreshold) {
      s.state = "open";
      s.openedAt = Date.now();
    }
    throw err;
  }
}

/** Read-only snapshot of every breaker touched so far — for `/api/ops/*`. */
export function getAllBreakerStates(): Record<string, { state: string; consecutiveFailures: number }> {
  const out: Record<string, { state: string; consecutiveFailures: number }> = {};
  for (const [name, s] of breakers) {
    out[name] = { state: s.state, consecutiveFailures: s.consecutiveFailures };
  }
  return out;
}

/** Test-only: reset a breaker's state between test cases. */
export function resetCircuitBreaker(name: string): void {
  breakers.delete(name);
}
