import assert from "node:assert/strict";
import { test } from "node:test";
import { mapWithConcurrency } from "./concurrency.ts";

test("mapWithConcurrency — never runs more than `limit` at once", async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const items = Array.from({ length: 12 }, (_, i) => i);

  await mapWithConcurrency(items, 4, async (i) => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    return i;
  });

  assert.ok(maxInFlight <= 4, `max in flight was ${maxInFlight}`);
});

test("mapWithConcurrency — preserves result order regardless of completion order", async () => {
  const items = [30, 5, 20, 1, 10];
  const results = await mapWithConcurrency(items, 3, async (ms) => {
    await new Promise((r) => setTimeout(r, ms));
    return ms;
  });
  assert.deepEqual(results, items);
});

test("mapWithConcurrency — empty input resolves to an empty array", async () => {
  const results = await mapWithConcurrency([], 4, async () => 1);
  assert.deepEqual(results, []);
});
