import assert from "node:assert/strict";
import { test } from "node:test";
import { opus5CostUsd } from "./anthropic-cost.ts";

test("opus5CostUsd — computes cost from input/output token counts", () => {
  const cost = opus5CostUsd({ input_tokens: 1000, output_tokens: 500 });
  // 1000 * (5/1e6) + 500 * (25/1e6) = 0.005 + 0.0125 = 0.0175
  assert.ok(Math.abs(cost - 0.0175) < 1e-9);
});

test("opus5CostUsd — treats missing usage fields as zero", () => {
  assert.equal(opus5CostUsd({}), 0);
  assert.equal(opus5CostUsd({ input_tokens: null, output_tokens: null }), 0);
});
