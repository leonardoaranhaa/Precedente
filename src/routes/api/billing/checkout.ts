import { createFileRoute } from "@tanstack/react-router";
import { startPremiumCheckoutFor } from "@/lib/billing/checkout";
import { requireUserId, UnauthorizedError } from "@/lib/auth/verify.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

/** Retorna a URL do Stripe Checkout — o mobile abre no navegador do sistema (Linking.openURL). */
export const Route = createFileRoute("/api/billing/checkout")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async () => {
        let userId: string;
        try {
          userId = await requireUserId();
        } catch (err) {
          if (err instanceof UnauthorizedError) return json({ error: "Não autorizado." }, 401);
          throw err;
        }
        try {
          const { url } = await startPremiumCheckoutFor(userId);
          return json({ url });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Não deu pra iniciar o checkout.";
          return json({ error: message }, 502);
        }
      },
    },
  },
});
