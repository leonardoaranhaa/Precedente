import { createFileRoute } from "@tanstack/react-router";
import { getEntitlement, isEntitlementActive } from "@/lib/billing/entitlements";
import { requireUserId, UnauthorizedError } from "@/lib/auth/verify.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export const Route = createFileRoute("/api/billing/status")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () => {
        let userId: string;
        try {
          userId = await requireUserId();
        } catch (err) {
          if (err instanceof UnauthorizedError) return json({ error: "Não autorizado." }, 401);
          throw err;
        }
        const entitlement = await getEntitlement(userId);
        return json({ entitlement, active: isEntitlementActive(entitlement) });
      },
    },
  },
});
