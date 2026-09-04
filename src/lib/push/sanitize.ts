import type { PriceZone, RsiZone, WatchTarget } from "./types";

function finiteOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Nunca confia em número vindo do cliente: descarta não-finito, corrige min > max invertido. */
export function sanitizePriceZone(v: unknown): PriceZone | undefined {
  if (!v || typeof v !== "object") return undefined;
  const raw = v as Record<string, unknown>;
  const enabled = raw.enabled === true;
  let min = finiteOrNull(raw.min);
  let max = finiteOrNull(raw.max);
  if (min != null && min < 0) min = null;
  if (max != null && max < 0) max = null;
  if (min != null && max != null && min > max) [min, max] = [max, min];
  if (min == null && max == null) return { enabled: false, min: null, max: null };
  return { enabled, min, max };
}

/** RSI é sempre 0–100 — qualquer valor fora disso é descartado, não clampado (evita disparo falso). */
export function sanitizeRsiZone(v: unknown): RsiZone | undefined {
  if (!v || typeof v !== "object") return undefined;
  const raw = v as Record<string, unknown>;
  const enabled = raw.enabled === true;
  const inRange = (n: number | null) => (n != null && n >= 0 && n <= 100 ? n : null);
  const below = inRange(finiteOrNull(raw.below));
  const above = inRange(finiteOrNull(raw.above));
  if (below == null && above == null) return { enabled: false, below: null, above: null };
  return { enabled, below, above };
}

export function sanitizeWatchTarget(w: WatchTarget): WatchTarget {
  const priceZone = sanitizePriceZone(w.priceZone);
  const rsiZone = sanitizeRsiZone(w.rsiZone);
  return {
    ticker: w.ticker,
    timeframe: w.timeframe,
    ...(w.displayTicker ? { displayTicker: w.displayTicker } : {}),
    ...(priceZone ? { priceZone } : {}),
    ...(rsiZone ? { rsiZone } : {}),
  };
}
