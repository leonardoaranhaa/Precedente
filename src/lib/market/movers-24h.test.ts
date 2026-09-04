import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMoversForPush, type MoversSnapshot, MOVERS_DISCLAIMER } from "./movers-24h.ts";

test("formatMoversForPush monta linhas factuais sem buy/sell", () => {
  const snap: MoversSnapshot = {
    fetchedAt: Date.now(),
    source: "Binance",
    disclaimer: MOVERS_DISCLAIMER,
    byAbsChange: [],
    byQuoteVolume: [
      {
        symbol: "BTCUSDT",
        base: "BTC",
        lastPrice: 100_000,
        changePct: 2.5,
        volumeBase: 1,
        quoteVolume: 2.5e9,
        high: 101_000,
        low: 98_000,
        open: 99_000,
        session: "acima",
        rangePct: 3,
      },
    ],
    gainers: [
      {
        symbol: "SOLUSDT",
        base: "SOL",
        lastPrice: 200,
        changePct: 8.2,
        volumeBase: 1,
        quoteVolume: 5e8,
        high: 210,
        low: 180,
        open: 185,
        session: "acima",
        rangePct: 16,
      },
    ],
    losers: [
      {
        symbol: "XRPUSDT",
        base: "XRP",
        lastPrice: 0.5,
        changePct: -4.1,
        volumeBase: 1,
        quoteVolume: 3e8,
        high: 0.55,
        low: 0.48,
        open: 0.52,
        session: "abaixo",
        rangePct: 13,
      },
    ],
  };
  const text = formatMoversForPush(snap);
  assert.match(text, /BTC/);
  assert.match(text, /vol/);
  assert.match(text, /sessão acima/);
  assert.match(text, /SOL/);
  assert.match(text, /XRP/);
  assert.doesNotMatch(text, /compr/i);
  assert.doesNotMatch(text, /vend/i);
  assert.doesNotMatch(text, /entrada/i);
});
