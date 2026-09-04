import assert from "node:assert/strict";
import { test } from "node:test";
import { coinFromTicker } from "./context-for-ticker.ts";

test("coinFromTicker extrai base de pares USDT", () => {
  assert.equal(coinFromTicker("BTCUSDT"), "BTC");
  assert.equal(coinFromTicker("ethusdt"), "ETH");
  assert.equal(coinFromTicker("SOL/USDT"), "SOL");
});

test("coinFromTicker outros quotes", () => {
  assert.equal(coinFromTicker("BTCUSDC"), "BTC");
  assert.equal(coinFromTicker("ETHBTC"), "ETH");
});

test("coinFromTicker vazio", () => {
  assert.equal(coinFromTicker(""), "");
  assert.equal(coinFromTicker("   "), "");
});
