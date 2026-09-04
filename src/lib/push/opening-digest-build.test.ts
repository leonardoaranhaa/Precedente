import assert from "node:assert/strict";
import { test } from "node:test";
import { formatOpeningBody, formatOpeningTitle } from "./opening-digest-build.ts";

test("opening body factual sem buy/sell", () => {
  const body = formatOpeningBody([
    {
      displayTicker: "BTC/USDT",
      timeframe: "1d",
      sampleNote: "ok",
      matches: 40,
      medianPct: 0.5,
      p10: -2,
      p90: 3,
      medianDd: -1.2,
      baselineDd: -0.8,
    },
  ]);
  assert.match(body, /BTC\/USDT/);
  assert.match(body, /P10\/P90/);
  assert.doesNotMatch(body, /\b(compre|venda|entre|saia)\b/i);
});

test("título com contagem", () => {
  assert.match(formatOpeningTitle(2), /2 par/);
});
