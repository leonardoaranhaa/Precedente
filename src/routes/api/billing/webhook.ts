import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";
import { getStripe, getWebhookSecret } from "@/lib/billing/stripe";
import {
  findUserIdByStripeCustomer,
  upsertEntitlement,
  type EntitlementStatus,
} from "@/lib/billing/entitlements";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Mapeia o status do Stripe pros 4 estados que o app entende. */
function mapStatus(stripeStatus: Stripe.Subscription.Status): EntitlementStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
    case "paused":
      return "canceled";
    default:
      return "inactive";
  }
}

function periodEndOf(sub: Stripe.Subscription): string | null {
  const ts = sub.items.data[0]?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

async function syncFromSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId = await findUserIdByStripeCustomer(customerId);
  if (!userId) return; // subscription de um customer que não é nosso (não deveria acontecer)
  await upsertEntitlement({
    userId,
    plan: "premium",
    status: mapStatus(sub.status),
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    currentPeriodEnd: periodEndOf(sub),
  });
}

export const Route = createFileRoute("/api/billing/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sig = request.headers.get("stripe-signature");
        if (!sig) return json({ error: "Sem assinatura." }, 400);

        const stripe = getStripe();
        const secret = getWebhookSecret();
        const rawBody = await request.text();

        let event: Stripe.Event;
        try {
          event = stripe.webhooks.constructEvent(rawBody, sig, secret);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Assinatura inválida.";
          return json({ error: message }, 400);
        }

        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object;
            if (session.mode === "subscription" && session.subscription) {
              const subId =
                typeof session.subscription === "string"
                  ? session.subscription
                  : session.subscription.id;
              const sub = await stripe.subscriptions.retrieve(subId);
              await syncFromSubscription(sub);
            }
            break;
          }
          case "customer.subscription.updated":
          case "customer.subscription.deleted": {
            await syncFromSubscription(event.data.object);
            break;
          }
          default:
            break;
        }

        return json({ received: true });
      },
    },
  },
});
