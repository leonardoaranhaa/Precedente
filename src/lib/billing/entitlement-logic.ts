/**
 * Lógica pura de entitlement — sem import de banco, pra poder ser testada
 * isolada (db.ts usa import.meta.glob, que só o Vite resolve; nenhum módulo
 * testado por `node --experimental-strip-types --test` pode importá-lo).
 */

export type Plan = "free" | "premium";
export type EntitlementStatus = "inactive" | "active" | "past_due" | "canceled";

export type Entitlement = {
  userId: string;
  plan: Plan;
  status: EntitlementStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
};

/**
 * True só quando a assinatura está paga e dentro do período — o mesmo
 * critério que o Stripe usa pra decidir se cobra de novo. Sem
 * current_period_end (nunca deveria acontecer com status active vindo do
 * webhook, mas defensivo) trata como válido só se o status for active.
 */
export function isEntitlementActive(e: Entitlement | null, now = new Date()): boolean {
  if (!e || e.plan !== "premium" || e.status !== "active") return false;
  if (!e.currentPeriodEnd) return true;
  return new Date(e.currentPeriodEnd).getTime() > now.getTime();
}
