/**
 * Ponte server-side: resolve hasPremium(userId) e delega a assertPremiumFeature.
 * Separado do módulo puro para não puxar db.ts nos testes unitários.
 */

import { hasPremium } from "./entitlements.ts";
import {
  assertPremiumFeature,
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
 *
 * `email`, quando informado, habilita o bypass de staff: superadmin/
 * developer (SUPERADMIN_EMAILS/DEVELOPER_EMAILS) sempre passam como se
 * fossem Premium — pra poder testar a feature sem precisar de uma
 * assinatura real. Opcional porque nem todo call site tem o e-mail à mão
 * sem plumbing extra (ex.: sync.ts, que só tem o userId).
 */
export async function assertPremiumFeatureForUser(
  userId: string | null | undefined,
  feature: PremiumFeature,
  opts: Omit<AssertPremiumFeatureOpts, "gatesEnabled"> & { email?: string | null } = {},
): Promise<{ isPremium: boolean }> {
  const { email, ...rest } = opts;

  const { resolveBillingGatesEnabled } = await import("../admin/feature-flags.server");
  const gatesEnabled = await resolveBillingGatesEnabled();
  if (!gatesEnabled) {
    return { isPremium: false };
  }

  const { isStaff } = await import("../admin/roles");
  if (isStaff(email)) {
    return { isPremium: true };
  }

  const isPremium = userId ? await hasPremium(userId) : false;
  assertPremiumFeature(isPremium, feature, { ...rest, gatesEnabled: true });
  return { isPremium };
}
