import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  consecutiveDirection,
  lastSwing,
  median,
  percentile,
  rollingHigh,
  rollingLow,
  rsi,
  sma,
} from "./indicators.ts";
import type { Candle } from "./types.ts";

function candle(o: number, h: number, l: number, c: number, t = 0): Candle {
  return { t, o, h, l, c, v: 1 };
}

describe("sma", () => {
  it("is null before the window fills, then the plain average", () => {
    assert.deepEqual(sma([1, 2, 3, 4, 5], 2), [null, 1.5, 2.5, 3.5, 4.5]);
  });

  it("is all-null when there is not enough history for one window", () => {
    assert.deepEqual(sma([1, 2], 5), [null, null]);
  });

  it("returns all-null for a non-positive period instead of dividing by zero", () => {
    assert.deepEqual(sma([1, 2, 3], 0), [null, null, null]);
  });
});

describe("rsi (Wilder)", () => {
  it("is 100 once the lookback is all gains (avgLoss = 0)", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    const out = rsi(closes, 14);
    assert.equal(out[14], 100);
    assert.equal(out[19], 100);
  });

  it("is 0 once the lookback is all losses (avgGain = 0)", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 - i);
    const out = rsi(closes, 14);
    assert.equal(out[14], 0);
    assert.equal(out[19], 0);
  });

  it("stays within [0, 100] for a mixed series", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + 5 * Math.sin(i / 3));
    const out = rsi(closes, 14);
    for (const v of out) {
      if (v == null) continue;
      assert.ok(v >= 0 && v <= 100, `rsi ${v} out of [0,100]`);
    }
  });

  it("is null until the first full period", () => {
    const closes = [1, 2, 3, 4, 5];
    assert.deepEqual(rsi(closes, 14), [null, null, null, null, null]);
  });
});

describe("rollingHigh / rollingLow", () => {
  it("tracks the max/min of the trailing window", () => {
    const values = [1, 5, 3, 8, 2, 9];
    assert.deepEqual(rollingHigh(values, 3), [null, null, 5, 8, 8, 9]);
    assert.deepEqual(rollingLow(values, 3), [null, null, 1, 3, 2, 2]);
  });
});

describe("consecutiveDirection", () => {
  it("counts a run of same-direction candles, signed", () => {
    const candles = [
      candle(1, 2, 1, 2), // up
      candle(2, 3, 2, 3), // up
      candle(3, 4, 3, 4), // up
      candle(4, 4, 2, 2), // down
    ];
    assert.equal(consecutiveDirection(candles, 2), 3);
    assert.equal(consecutiveDirection(candles, 3), -1);
  });

  it("is 0 at index 0 — there is no prior candle to confirm a streak", () => {
    const candles = [candle(1, 2, 1, 2)];
    assert.equal(consecutiveDirection(candles, 0), 0);
  });
});

describe("lastSwing", () => {
  it("finds a local top surrounded by lower highs", () => {
    // index 4 is a clean local high: 1,2,3,10,3,2,1 around it.
    const highs = [1, 2, 3, 4, 10, 4, 3, 2, 1, 0.5];
    const candles = highs.map((h, i) => candle(h - 1, h, h - 1, h - 0.5, i));
    const swing = lastSwing(candles, candles.length - 1, 4);
    assert.ok(swing);
    assert.equal(swing?.type, "top");
    assert.equal(swing?.price, 10);
  });

  it("returns null when no clean swing exists in range", () => {
    const candles = Array.from({ length: 6 }, (_, i) => candle(i, i + 1, i, i + 0.5, i));
    assert.equal(lastSwing(candles, 5, 4), null);
  });
});

describe("percentile / median", () => {
  it("median of an odd-length array is the middle value", () => {
    assert.equal(median([5, 1, 3]), 3);
  });

  it("percentile interpolates between the two nearest ranks", () => {
    const values = [1, 2, 3, 4, 5];
    assert.equal(percentile(values, 0), 1);
    assert.equal(percentile(values, 1), 5);
    assert.equal(percentile(values, 0.25), 2);
    assert.equal(percentile(values, 0.5), 3);
  });

  it("is 0 for an empty array instead of throwing", () => {
    assert.equal(median([]), 0);
    assert.equal(percentile([], 0.5), 0);
  });
});
