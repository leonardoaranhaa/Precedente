import { createFileRoute } from "@tanstack/react-router";
import { upsertEntitlement, getEntitlement } from "@/lib/billing/entitlements";
import { requireAdmin, AdminForbiddenError } from "@/lib/admin/require-admin.server";
import { UnauthorizedError } from "@/lib/auth/verify.server";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Concede ou revoga Premium manualmente, sem passar pelo Stripe — só
 * superadmin (ação que afeta outro usuário, diferente do bypass automático
 * de staff em assertPremiumFeatureForUser). Um evento real de assinatura
 * (webhook do Stripe) sobrescreve isso depois — é override, não permanente.
 */
export const Route = createFileRoute("/api/admin/grant-premium")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let admin;
        try {
          admin = await requireAdmin("superadmin");
        } catch (err) {
          if (err instanceof AdminForbiddenError) return json({ error: err.message }, 403);
          if (err instanceof UnauthorizedError) return json({ error: "Não autorizado." }, 401);
          throw err;
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Corpo da requisição inválido (esperado JSON)." }, 400);
        }
        const raw = body as Record<string, unknown>;
        const userId = typeof raw.userId === "string" ? raw.userId : "";
        const grant = raw.grant === true;
        if (!userId) {
          return json({ error: "userId é obrigatório." }, 400);
        }

        const existing = await getEntitlement(userId);
        await upsertEntitlement({
          userId,
          plan: grant ? "premium" : "free",
          status: grant ? "active" : "inactive",
          stripeCustomerId: existing?.stripeCustomerId ?? null,
          stripeSubscriptionId: existing?.stripeSubscriptionId ?? null,
          currentPeriodEnd: grant ? null : existing?.currentPeriodEnd ?? null,
        });

        return json({ ok: true, userId, grant, by: admin.email });
      },
    },
  },
});
