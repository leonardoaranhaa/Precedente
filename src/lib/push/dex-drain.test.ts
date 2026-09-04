import assert from "node:assert/strict";
import { test } from "node:test";
import { detectDrain } from "./dex-drain.ts";
import type { OnchainContext } from "@/lib/market/types";

function makeCtx(overrides: Partial<OnchainContext> = {}): OnchainContext {
  return {
    fetchedAt: Date.now(),
    fundingRate: null,
    markPrice: null,
    openInterest: null,
    nextFundingTime: null,
    derivativesSource: null,
    chainId: "solana",
    dexId: "raydium",
    pairUrl: null,
    liquidityUsd: 500_000,
    volume24hUsd: 100_000,
    volume6hUsd: 40_000,
    volume1hUsd: 8_000,
    buys24h: 200,
    sells24h: 200,
    buys6h: 50,
    sells6h: 50,
    priceChange24hPct: -2,
    priceChange6hPct: -1,
    priceChange1hPct: 0,
    pairAgeHours: 72,
    dexSource: "DexScreener",
    sources: ["DexScreener"],
    ...overrides,
  };
}

test("detectDrain retorna null quando tudo normal", () => {
  const result = detectDrain("TOKENUSDT", "TOKEN", makeCtx());
  assert.equal(result, null);
});

test("detectDrain detecta liquidez crítica", () => {
  const result = detectDrain("TOKENUSDT", "TOKEN", makeCtx({ liquidityUsd: 5_000 }));
  assert.notEqual(result, null);
  assert.ok(result!.reason.includes("liquidez crítica"));
});

test("detectDrain detecta dominância de vendas em 6h", () => {
  const result = detectDrain("TOKENUSDT", "TOKEN", makeCtx({ buys6h: 10, sells6h: 90 }));
  assert.notEqual(result, null);
  assert.ok(result!.reason.includes("vendas em 6h"));
  assert.ok(result!.sellRatio6h! >= 0.75);
});

test("detectDrain detecta queda forte de preço em 1h", () => {
  const result = detectDrain("TOKENUSDT", "TOKEN", makeCtx({ priceChange1hPct: -15 }));
  assert.notEqual(result, null);
  assert.ok(result!.reason.includes("1h"));
});

test("detectDrain combina múltiplos sinais", () => {
  const result = detectDrain(
    "TOKENUSDT",
    "TOKEN",
    makeCtx({ liquidityUsd: 3_000, buys6h: 5, sells6h: 95, priceChange1hPct: -20 }),
  );
  assert.notEqual(result, null);
  const reasons = result!.reason.split(" · ");
  assert.ok(reasons.length >= 2);
});

test("detectDrain ignora sell ratio com poucas transações", () => {
  const result = detectDrain("TOKENUSDT", "TOKEN", makeCtx({ buys6h: 1, sells6h: 9 }));
  assert.equal(result, null);
});
