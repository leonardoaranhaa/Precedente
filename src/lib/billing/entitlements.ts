import { createServerFn } from "@tanstack/react-start";
import { getSql } from "../db.ts";
import { authMiddleware } from "../auth/middleware.ts";
import {
  isEntitlementActive,
  type Entitlement,
  type EntitlementStatus,
  type Plan,
} from "./entitlement-logic.ts";

export type { Entitlement, EntitlementStatus, Plan };
export { isEntitlementActive };

type Row = {
  user_id: string;
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
};

function fromRow(r: Row): Entitlement {
  return {
    userId: r.user_id,
    plan: r.plan as Plan,
    status: r.status as EntitlementStatus,
    stripeCustomerId: r.stripe_customer_id,
    stripeSubscriptionId: r.stripe_subscription_id,
    currentPeriodEnd: r.current_period_end,
  };
}

/** Estado de cobrança do usuário, ou null se ele nunca iniciou um checkout. */
export async function getEntitlement(userId: string): Promise<Entitlement | null> {
  const sql = await getSql();
  const rows = await sql.query<Row>(
    "select * from user_entitlements where user_id = $1",
    [userId],
  );
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function hasPremium(userId: string): Promise<boolean> {
  return isEntitlementActive(await getEntitlement(userId));
}

/** Pro cliente: plano do usuário logado + se está ativo agora. */
export const getMyEntitlement = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const entitlement = await getEntitlement(context.userId);
    return { entitlement, active: isEntitlementActive(entitlement) };
  });

/** Upsert completo — chamado só pelo webhook do Stripe (fonte da verdade). */
export async function upsertEntitlement(input: {
  userId: string;
  plan: Plan;
  status: EntitlementStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
}): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into user_entitlements
       (user_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, updated_at)
     values ($1, $2, $3, $4, $5, $6, now())
     on conflict (user_id) do update set
       plan = excluded.plan,
       status = excluded.status,
       stripe_customer_id = excluded.stripe_customer_id,
       stripe_subscription_id = excluded.stripe_subscription_id,
       current_period_end = excluded.current_period_end,
       updated_at = excluded.updated_at`,
    [
      input.userId,
      input.plan,
      input.status,
      input.stripeCustomerId,
      input.stripeSubscriptionId,
      input.currentPeriodEnd,
    ],
  );
}

/** Acha o userId a partir do stripe_customer_id (eventos de assinatura só trazem o customer). */
export async function findUserIdByStripeCustomer(
  stripeCustomerId: string,
): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql.query<{ user_id: string }>(
    "select user_id from user_entitlements where stripe_customer_id = $1",
    [stripeCustomerId],
  );
  return rows[0]?.user_id ?? null;
}
