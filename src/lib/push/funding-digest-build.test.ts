import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatFundingDigestBody,
  formatFundingDigestTitle,
  FUNDING_DIGEST_DISCLAIMER,
} from "./funding-digest-build.ts";

test("formatFundingDigestBody monta linhas factuais", () => {
  const body = formatFundingDigestBody([
    {
      displayTicker: "BTC/USDT",
      symbol: "BTCUSDT",
      fundingRate: 0.0001,
      openInterest: 2_500_000,
      markPrice: 100_000,
      source: "Binance Futures",
    },
  ]);
  assert.match(body, /BTC\/USDT/);
  assert.match(body, /f \+/);
  assert.match(body, /OI/);
  assert.match(body, /posicionamento/);
  assert.ok(body.includes(FUNDING_DIGEST_DISCLAIMER.slice(0, 20)));
  assert.doesNotMatch(body, /\b(compre|venda|longo|curto)\b/i);
});

test("título reflete contagem", () => {
  assert.match(
    formatFundingDigestTitle([
      {
        displayTicker: "ETH/USDT",
        symbol: "ETHUSDT",
        fundingRate: -0.0002,
        openInterest: null,
        markPrice: null,
        source: null,
      },
    ]),
    /1 par/,
  );
});
