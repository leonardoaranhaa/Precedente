import { createFileRoute } from "@tanstack/react-router";
import { fetchExternalIntel, validateIntelTicker } from "@/lib/market/external-intel";
import { assertExternalIntelQuota } from "@/lib/external-intel-rate-limit-logic";
import { RateLimitError } from "@/lib/rate-limit";
import { CircuitOpenError } from "@/lib/circuit-breaker";
import { requireUserId, UnauthorizedError } from "@/lib/auth/verify.server";
import { hasPremium } from "@/lib/billing/entitlements";
import { reportServerError } from "@/lib/sentry.server";

/**
 * PROTÓTIPO — rota isolada, sem link em nenhuma tela/nav. Existe só pra dar
 * pra testar o agente de inteligência externa (busca web real + Sonnet) de
 * ponta a ponta antes de decidir se entra no produto de verdade. Exige
 * login + assinatura premium ativa desde já — é a rota mais cara do app
 * (Sonnet + até 4 buscas web reais por chamada).
 */
import { authCorsHeaders } from "@/lib/cors";

const CORS_HEADERS = authCorsHeaders("POST, OPTIONS");

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export const Route = createFileRoute("/api/assistant/external-intel")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        let userId: string;
        try {
          userId = await requireUserId();
        } catch (err) {
          if (err instanceof UnauthorizedError) return json({ error: "Não autorizado." }, 401);
          throw err;
        }

        if (!(await hasPremium(userId))) {
          return json(
            { error: "Inteligência externa é um recurso premium. Assine para liberar." },
            402,
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Corpo da requisição inválido (esperado JSON)." }, 400);
        }

        let ticker: string;
        try {
          const raw = (body as { ticker?: unknown } | null)?.ticker;
          ticker = validateIntelTicker(raw);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Pedido inválido.";
          return json({ error: message }, 400);
        }

        try {
          assertExternalIntelQuota(userId);
          const result = await fetchExternalIntel(ticker);
          return json(result);
        } catch (err) {
          if (err instanceof RateLimitError) {
            return json({ error: err.message }, err.status);
          }
          if (err instanceof CircuitOpenError) {
            return json({ error: err.message }, 503);
          }
          reportServerError(err, { route: "/api/assistant/external-intel" });
          const message =
            err instanceof Error ? err.message : "Não foi possível buscar contexto externo.";
          return json({ error: message }, 502);
        }
      },
    },
  },
});
