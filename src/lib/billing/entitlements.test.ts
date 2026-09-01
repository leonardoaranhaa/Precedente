import { test } from "node:test";
import assert from "node:assert/strict";
import { isEntitlementActive, type Entitlement } from "./entitlement-logic.ts";

function entitlement(overrides: Partial<Entitlement> = {}): Entitlement {
  return {
    userId: "u1",
    plan: "free",
    status: "inactive",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    ...overrides,
  };
}

test("isEntitlementActive", async (t) => {
  await t.test("null entitlement (never checked out) is never active", () => {
    assert.equal(isEntitlementActive(null), false);
  });

  await t.test("free plan is never active regardless of status", () => {
    assert.equal(isEntitlementActive(entitlement({ plan: "free", status: "active" })), false);
  });

  await t.test("premium + active with no period end is active (defensive default)", () => {
    assert.equal(
      isEntitlementActive(entitlement({ plan: "premium", status: "active", currentPeriodEnd: null })),
      true,
    );
  });

  await t.test("premium + active within the paid period is active", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    const e = entitlement({
      plan: "premium",
      status: "active",
      currentPeriodEnd: "2026-07-01T00:00:00Z",
    });
    assert.equal(isEntitlementActive(e, now), true);
  });

  await t.test("premium + active but past the period end is NOT active", () => {
    const now = new Date("2026-07-15T00:00:00Z");
    const e = entitlement({
      plan: "premium",
      status: "active",
      currentPeriodEnd: "2026-07-01T00:00:00Z",
    });
    assert.equal(isEntitlementActive(e, now), false);
  });

  await t.test("premium + past_due is not active even within the period", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    const e = entitlement({
      plan: "premium",
      status: "past_due",
      currentPeriodEnd: "2026-07-01T00:00:00Z",
    });
    assert.equal(isEntitlementActive(e, now), false);
  });

  await t.test("premium + canceled is not active", () => {
    const e = entitlement({ plan: "premium", status: "canceled" });
    assert.equal(isEntitlementActive(e), false);
  });
});
