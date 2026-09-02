import assert from "node:assert/strict";
import { test } from "node:test";
import { pairKey, uniqueWatchPairs } from "./scan-logic.ts";

test("uniqueWatchPairs — the same pair watched by many subscriptions is analyzed once", () => {
  const subs = [
    { watches: [{ ticker: "BTCUSDT", timeframe: "4h" as const }] },
    { watches: [{ ticker: "BTCUSDT", timeframe: "4h" as const }, { ticker: "ETHUSDT", timeframe: "1h" as const }] },
    { watches: [{ ticker: "BTCUSDT", timeframe: "4h" as const }] },
  ];
  const pairs = uniqueWatchPairs(subs);
  assert.equal(pairs.length, 2);
  assert.ok(pairs.some((p) => pairKey(p.ticker, p.timeframe) === "BTCUSDT:4h"));
  assert.ok(pairs.some((p) => pairKey(p.ticker, p.timeframe) === "ETHUSDT:1h"));
});

test("uniqueWatchPairs — same ticker on different timeframes are distinct pairs", () => {
  const subs = [
    { watches: [{ ticker: "BTCUSDT", timeframe: "1h" as const }] },
    { watches: [{ ticker: "BTCUSDT", timeframe: "4h" as const }] },
  ];
  assert.equal(uniqueWatchPairs(subs).length, 2);
});

test("uniqueWatchPairs — no subscriptions, no pairs", () => {
  assert.deepEqual(uniqueWatchPairs([]), []);
});
