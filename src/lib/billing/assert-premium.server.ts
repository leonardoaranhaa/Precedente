/**
 * Ponte server-side: resolve hasPremium(userId) e delega a assertPremiumFeature.
 * Separado do módulo puro para não puxar db.ts nos testes unitários.
 */

import { hasPremium } from "./entitlements.ts";
import {
  assertPremiumFeature,
  billingGatesEnabled,
  type AssertPremiumFeatureOpts,
  type PremiumFeature,
} from "./plan-limits.ts";

export {
  assertPremiumFeature,
  billingGatesEnabled,
  PremiumQuotaError,
  PremiumRequiredError,
  PLAN_LIMITS,
  resolvePlanLimits,
  countWatchItems,
  watchesHaveEnabledZones,
} from "./plan-limits.ts";
export type { PremiumFeature, PlanLimits, AssertPremiumFeatureOpts } from "./plan-limits.ts";

/**
 * Enforça feature para um userId conhecido.
 * userId null + gates on: tratado como free (isPremium false).
 */
export async function assertPremiumFeatureForUser(
  userId: string | null | undefined,
  feature: PremiumFeature,
  opts: Omit<AssertPremiumFeatureOpts, "gatesEnabled"> = {},
): Promise<{ isPremium: boolean }> {
  if (!billingGatesEnabled()) {
    return { isPremium: false };
  }
  const isPremium = userId ? await hasPremium(userId) : false;
  assertPremiumFeature(isPremium, feature, { ...opts, gatesEnabled: true });
  return { isPremium };
}
