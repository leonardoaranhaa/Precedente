import assert from "node:assert/strict";
import { test } from "node:test";
import { baselineDeltaLabel } from "./baseline-copy.ts";

test("baselineDeltaLabel — a delta below the noise floor reads as 'em linha'", () => {
  assert.equal(baselineDeltaLabel(52, 51), "em linha com a base do par");
  assert.equal(baselineDeltaLabel(51, 52), "em linha com a base do par");
  assert.equal(baselineDeltaLabel(50, 50), "em linha com a base do par");
});

test("baselineDeltaLabel — a real gap shows the signed delta", () => {
  assert.equal(baselineDeltaLabel(58, 50), "+8 pts vs. a base do par");
  assert.equal(baselineDeltaLabel(20, 50), "-30 pts vs. a base do par");
});

test("baselineDeltaLabel — a purely random series produces a delta near zero", () => {
  // Same distribution sampled twice (conditional == baseline by construction).
  assert.equal(baselineDeltaLabel(50, 50), "em linha com a base do par");
});
