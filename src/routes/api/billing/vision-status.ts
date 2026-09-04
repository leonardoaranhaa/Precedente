import { createFileRoute } from "@tanstack/react-router";
import { getSessionUser } from "@/lib/auth/verify.server";
import { hasPremium } from "@/lib/billing/entitlements";
import { billingGatesEnabled } from "@/lib/billing/plan-limits";

export const Route = createFileRoute("/api/billing/vision-status")({
  server: {
    handlers: {
      GET: async () => {
        const session = await getSessionUser();
        if (!session?.id) {
          return new Response(JSON.stringify({ error: "Não autenticado." }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        const gates = billingGatesEnabled();
        if (!gates) {
          return new Response(
            JSON.stringify({
              gatesEnabled: false,
              used: 0,
              limit: null,
              remaining: null,
              nearLimit: false,
              exhausted: false,
              message: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
            },
          );
        }
        const isPremium = await hasPremium(session.id);
        const { getVisionQuotaSnapshot } = await import("@/lib/billing/vision-quota");
        const snap = getVisionQuotaSnapshot(session.id, isPremium);
        return new Response(JSON.stringify({ gatesEnabled: true, isPremium, ...snap }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
