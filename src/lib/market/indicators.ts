import type { Candle } from "./types";

export function sma(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** Wilder RSI. Returns null until the first full period. */
export function rsi(closes: number[], period = 14): Array<number | null> {
  const out: Array<number | null> = Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i]! - closes[i - 1]!;
    if (d >= 0) gain += d;
    else loss -= d;
  }

  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i]! - closes[i - 1]!;
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function rollingHigh(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null);
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) continue;
    let m = -Infinity;
    for (let j = i - period + 1; j <= i; j++) m = Math.max(m, values[j]!);
    out[i] = m;
  }
  return out;
}

export function rollingLow(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null);
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) continue;
    let m = Infinity;
    for (let j = i - period + 1; j <= i; j++) m = Math.min(m, values[j]!);
    out[i] = m;
  }
  return out;
}

export function consecutiveDirection(candles: Candle[], index: number): number {
  if (index <= 0) return 0;
  const sign = candles[index]!.c >= candles[index]!.o ? 1 : -1;
  let n = 1;
  for (let i = index - 1; i >= 0; i--) {
    const s = candles[i]!.c >= candles[i]!.o ? 1 : -1;
    if (s !== sign) break;
    n += 1;
  }
  return sign * n;
}

export function lastSwing(
  candles: Candle[],
  index: number,
  lookback = 4,
): { type: "top" | "bottom"; barsAgo: number; price: number } | null {
  const start = Math.max(lookback, 1);
  const end = index - lookback;
  for (let i = end; i >= start; i--) {
    let isTop = true;
    let isBot = true;
    for (let k = 1; k <= lookback; k++) {
      if (candles[i]!.h <= candles[i - k]!.h || candles[i]!.h <= candles[i + k]!.h) {
        isTop = false;
      }
      if (candles[i]!.l >= candles[i - k]!.l || candles[i]!.l >= candles[i + k]!.l) {
        isBot = false;
      }
    }
    if (isTop) {
      return { type: "top", barsAgo: index - i, price: candles[i]!.h };
    }
    if (isBot) {
      return { type: "bottom", barsAgo: index - i, price: candles[i]!.l };
    }
  }
  return null;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! * (hi - idx) + sorted[hi]! * (idx - lo);
}

export function median(values: number[]): number {
  return percentile(values, 0.5);
}
