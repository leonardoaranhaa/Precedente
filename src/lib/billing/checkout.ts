import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getStripe, getPremiumPriceId } from "./stripe";
import { getEntitlement, upsertEntitlement } from "./entitlements";

function appOrigin(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:8080").replace(/\/+$/, "");
}

/** Cria (ou reusa) o Customer do Stripe pro usuário logado. */
async function ensureStripeCustomer(userId: string): Promise<string> {
  const existing = await getEntitlement(userId);
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const sql = await getSql();
  const rows = await sql.query<{ email: string; name: string }>(
    'select email, name from "user" where id = $1',
    [userId],
  );
  const user = rows[0];

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user?.email,
    name: user?.name,
    metadata: { userId },
  });

  await upsertEntitlement({
    userId,
    plan: existing?.plan ?? "free",
    status: existing?.status ?? "inactive",
    stripeCustomerId: customer.id,
    stripeSubscriptionId: existing?.stripeSubscriptionId ?? null,
    currentPeriodEnd: existing?.currentPeriodEnd ?? null,
  });

  return customer.id;
}

/** Abre um Stripe Checkout de assinatura pro plano premium. Volta a URL pra redirecionar o navegador. */
export const startPremiumCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const stripe = getStripe();
    const customerId = await ensureStripeCustomer(context.userId);
    const origin = appOrigin();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: getPremiumPriceId(), quantity: 1 }],
      success_url: `${origin}/?premium=sucesso`,
      cancel_url: `${origin}/?premium=cancelado`,
    });

    if (!session.url) throw new Error("O Stripe não retornou uma URL de checkout.");
    return { url: session.url };
  });

/** Abre o portal do Stripe pra quem já é assinante gerenciar/cancelar. */
export const openBillingPortal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const entitlement = await getEntitlement(context.userId);
    if (!entitlement?.stripeCustomerId) {
      throw new Error("Você ainda não iniciou uma assinatura.");
    }
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: entitlement.stripeCustomerId,
      return_url: `${appOrigin()}/`,
    });
    return { url: session.url };
  });
