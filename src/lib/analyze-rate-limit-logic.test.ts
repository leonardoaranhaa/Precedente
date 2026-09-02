import assert from "node:assert/strict";
import { test } from "node:test";
import { RateLimitError } from "./rate-limit.ts";
import { assertAnalyzeQuota, OHLC_LIMIT, VISION_LIMIT } from "./analyze-rate-limit-logic.ts";

test("assertAnalyzeQuota — OHLC bucket trips after its limit, without ever touching vision", () => {
  const ip = `ip-ohlc-${Math.random()}`;
  for (let i = 0; i < OHLC_LIMIT; i++) {
    assert.doesNotThrow(() => assertAnalyzeQuota(false, ip));
  }
  // N+1: quota is spent — this must reject before any Anthropic call happens.
  assert.throws(() => assertAnalyzeQuota(false, ip), RateLimitError);
});

test("assertAnalyzeQuota — vision bucket has its own, much stricter, limit", () => {
  const ip = `ip-vision-${Math.random()}`;
  for (let i = 0; i < VISION_LIMIT; i++) {
    assert.doesNotThrow(() => assertAnalyzeQuota(true, ip));
  }
  assert.throws(() => assertAnalyzeQuota(true, ip), RateLimitError);
});

test("assertAnalyzeQuota — OHLC and vision quotas for the same IP are independent", () => {
  const ip = `ip-split-${Math.random()}`;
  for (let i = 0; i < VISION_LIMIT; i++) assertAnalyzeQuota(true, ip);
  assert.throws(() => assertAnalyzeQuota(true, ip), RateLimitError);
  // Vision quota exhausted, but OHLC calls from the same IP still go through.
  assert.doesNotThrow(() => assertAnalyzeQuota(false, ip));
});

test("assertAnalyzeQuota — different IPs never share a bucket", () => {
  const ipA = `ip-a-${Math.random()}`;
  const ipB = `ip-b-${Math.random()}`;
  for (let i = 0; i < VISION_LIMIT; i++) assertAnalyzeQuota(true, ipA);
  assert.throws(() => assertAnalyzeQuota(true, ipA), RateLimitError);
  assert.doesNotThrow(() => assertAnalyzeQuota(true, ipB));
});
