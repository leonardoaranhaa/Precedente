/**
 * Volume anômalo vs mediana das barras anteriores — puro, sem direção de trade.
 */

import type { Candle } from "./types.ts";

export type VolumeAnomaly = {
  volLast: number;
  /** Mediana das `window` barras imediatamente anteriores à última. */
  volMedian: number | null;
  /** volLast / volMedian; null se sem base. */
  volRatio: number | null;
};

export function computeVolumeAnomaly(
  candles: Candle[],
  window = 20,
): VolumeAnomaly {
  if (candles.length === 0) {
    return { volLast: 0, volMedian: null, volRatio: null };
  }
  const last = candles[candles.length - 1]!;
  const volLast = last.v;
  if (candles.length < window + 1) {
    return { volLast, volMedian: null, volRatio: null };
  }
  const prior = candles.slice(-(window + 1), -1).map((c) => c.v);
  const sorted = [...prior].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const volMedian =
    sorted.length % 2 === 0
      ? (sorted[mid - 1]! + sorted[mid]!) / 2
      : sorted[mid]!;
  if (!(volMedian > 0) || !Number.isFinite(volMedian)) {
    return { volLast, volMedian: volMedian > 0 ? volMedian : null, volRatio: null };
  }
  const volRatio = volLast / volMedian;
  return {
    volLast,
    volMedian,
    volRatio: Number.isFinite(volRatio) ? volRatio : null,
  };
}

/** true se a barra atual está ≥ multiple × a mediana. */
export function isVolumeAnomalous(
  anomaly: VolumeAnomaly,
  multiple = 3,
): boolean {
  if (anomaly.volRatio == null) return false;
  return anomaly.volRatio >= multiple;
}
