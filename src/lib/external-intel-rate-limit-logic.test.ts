import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertExternalIntelQuota,
  EXTERNAL_INTEL_LIMIT,
  externalIntelBucketKey,
} from "./external-intel-rate-limit-logic.ts";
import { RateLimitError } from "./rate-limit.ts";

test("externalIntelBucketKey isola por usuário", () => {
  assert.equal(externalIntelBucketKey("u1"), "external-intel:u1");
  assert.notEqual(externalIntelBucketKey("u1"), externalIntelBucketKey("u2"));
});

test("assertExternalIntelQuota permite até o limite e bloqueia depois", () => {
  const userId = `test-user-${Math.random()}`;
  for (let i = 0; i < EXTERNAL_INTEL_LIMIT; i++) {
    assertExternalIntelQuota(userId); // não deve lançar
  }
  assert.throws(() => assertExternalIntelQuota(userId), RateLimitError);
});

test("assertExternalIntelQuota não mistura cota entre usuários diferentes", () => {
  const a = `test-user-a-${Math.random()}`;
  const b = `test-user-b-${Math.random()}`;
  for (let i = 0; i < EXTERNAL_INTEL_LIMIT; i++) assertExternalIntelQuota(a);
  assert.throws(() => assertExternalIntelQuota(a), RateLimitError);
  assertExternalIntelQuota(b); // usuário diferente, cota própria
});
