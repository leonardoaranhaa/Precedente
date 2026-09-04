import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeVolumeAnomaly,
  isVolumeAnomalous,
} from "./volume-anomaly.ts";
import type { Candle } from "./types.ts";

function c(v: number): Candle {
  return { t: 0, o: 1, h: 1, l: 1, c: 1, v };
}

test("ratio = last / median of prior 20", () => {
  const candles = Array.from({ length: 20 }, () => c(100)).concat([c(400)]);
  const a = computeVolumeAnomaly(candles, 20);
  assert.equal(a.volLast, 400);
  assert.equal(a.volMedian, 100);
  assert.equal(a.volRatio, 4);
  assert.equal(isVolumeAnomalous(a, 3), true);
  assert.equal(isVolumeAnomalous(a, 5), false);
});

test("sem janela suficiente → ratio null", () => {
  const a = computeVolumeAnomaly([c(10), c(20)], 20);
  assert.equal(a.volRatio, null);
  assert.equal(isVolumeAnomalous(a, 3), false);
});
