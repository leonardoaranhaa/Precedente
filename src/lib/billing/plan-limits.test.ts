import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertPremiumFeature,
  billingGatesEnabled,
  countWatchItems,
  PLAN_LIMITS,
  PremiumQuotaError,
  PremiumRequiredError,
  resolvePlanLimits,
  watchesHaveEnabledZones,
} from "./plan-limits.ts";
import {
  _resetVisionQuotaForTests,
  getVisionCountToday,
  incrementVisionCount,
} from "./vision-quota.ts";

test("billingGatesEnabled", () => {
  assert.equal(billingGatesEnabled({}), false);
  assert.equal(billingGatesEnabled({ BILLING_GATES_ENABLED: "false" }), false);
  assert.equal(billingGatesEnabled({ BILLING_GATES_ENABLED: "true" }), true);
  assert.equal(billingGatesEnabled({ BILLING_GATES_ENABLED: "1" }), true);
  assert.equal(billingGatesEnabled({ BILLING_GATES_ENABLED: "YES" }), true);
});

test("resolvePlanLimits", () => {
  assert.equal(resolvePlanLimits(false).maxWatches, PLAN_LIMITS.free.maxWatches);
  assert.equal(resolvePlanLimits(true).maxWatches, PLAN_LIMITS.premium.maxWatches);
  assert.equal(resolvePlanLimits(false).zonesEnabled, false);
  assert.equal(resolvePlanLimits(true).zonesEnabled, true);
});

test("assertPremiumFeature is no-op when gates disabled", () => {
  assert.doesNotThrow(() =>
    assertPremiumFeature(false, "zones", {
      hasEnabledZones: true,
      gatesEnabled: false,
    }),
  );
  assert.doesNotThrow(() =>
    assertPremiumFeature(false, "watch_slot", {
      watchCount: 99,
      gatesEnabled: false,
    }),
  );
});

test("zones: free blocked, premium allowed", () => {
  assert.throws(
    () =>
      assertPremiumFeature(false, "zones", {
        hasEnabledZones: true,
        gatesEnabled: true,
      }),
    (err: unknown) => err instanceof PremiumRequiredError && err.feature === "zones",
  );
  assert.doesNotThrow(() =>
    assertPremiumFeature(true, "zones", {
      hasEnabledZones: true,
      gatesEnabled: true,
    }),
  );
  assert.doesNotThrow(() =>
    assertPremiumFeature(false, "zones", {
      hasEnabledZones: false,
      gatesEnabled: true,
    }),
  );
});

test("watch_slot: free max 3, premium max 24", () => {
  assert.doesNotThrow(() =>
    assertPremiumFeature(false, "watch_slot", {
      watchCount: 3,
      gatesEnabled: true,
    }),
  );
  assert.throws(
    () =>
      assertPremiumFeature(false, "watch_slot", {
        watchCount: 4,
        gatesEnabled: true,
      }),
    (err: unknown) => err instanceof PremiumQuotaError && err.feature === "watch_slot",
  );
  assert.doesNotThrow(() =>
    assertPremiumFeature(true, "watch_slot", {
      watchCount: 24,
      gatesEnabled: true,
    }),
  );
  assert.throws(
    () =>
      assertPremiumFeature(true, "watch_slot", {
        watchCount: 25,
        gatesEnabled: true,
      }),
    PremiumQuotaError,
  );
});

test("vision: respects per-day quota", () => {
  assert.doesNotThrow(() =>
    assertPremiumFeature(false, "vision", {
      visionCountToday: 0,
      gatesEnabled: true,
    }),
  );
  assert.doesNotThrow(() =>
    assertPremiumFeature(false, "vision", {
      visionCountToday: 1,
      gatesEnabled: true,
    }),
  );
  assert.throws(
    () =>
      assertPremiumFeature(false, "vision", {
        visionCountToday: 2,
        gatesEnabled: true,
      }),
    (err: unknown) => err instanceof PremiumQuotaError && err.feature === "vision",
  );
  assert.doesNotThrow(() =>
    assertPremiumFeature(true, "vision", {
      visionCountToday: 9,
      gatesEnabled: true,
    }),
  );
  assert.throws(
    () =>
      assertPremiumFeature(true, "vision", {
        visionCountToday: 10,
        gatesEnabled: true,
      }),
    PremiumQuotaError,
  );
});

test("helpers countWatchItems / watchesHaveEnabledZones", () => {
  assert.equal(countWatchItems(null), 0);
  assert.equal(countWatchItems([{ a: 1 }, { b: 2 }]), 2);
  assert.equal(
    watchesHaveEnabledZones([
      { priceZone: { enabled: false } },
      { rsiZone: { enabled: true } },
    ]),
    true,
  );
  assert.equal(watchesHaveEnabledZones([{ priceZone: { enabled: false } }]), false);
});

test("vision-quota memory counter", () => {
  _resetVisionQuotaForTests();
  assert.equal(getVisionCountToday("u1"), 0);
  assert.equal(incrementVisionCount("u1"), 1);
  assert.equal(incrementVisionCount("u1"), 2);
  assert.equal(getVisionCountToday("u1"), 2);
  assert.equal(getVisionCountToday("u2"), 0);
  _resetVisionQuotaForTests();
});
