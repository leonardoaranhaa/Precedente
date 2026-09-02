import { createFileRoute } from "@tanstack/react-router";
import { runAnalysis, validateAnalyzeInput } from "@/lib/analyze";
import { RateLimitError } from "@/lib/rate-limit";
import { PremiumQuotaError, PremiumRequiredError } from "@/lib/billing/plan-limits";
import { reportServerError } from "@/lib/sentry.server";

// Liberado para qualquer origem: o app mobile (Expo) chama este endpoint
// diretamente de fora do navegador, sem cabeçalho Origin previsível.
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

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Corpo da requisição inválido (esperado JSON)." }, 400);
        }

        let input;
        try {
          input = validateAnalyzeInput(body);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Pedido inválido.";
          return json({ error: message }, 400);
        }

        try {
          const result = await runAnalysis(input);
          return json(result);
        } catch (err) {
          if (err instanceof RateLimitError) {
            return json({ error: err.message }, err.status);
          }
          if (err instanceof PremiumRequiredError || err instanceof PremiumQuotaError) {
            return json(
              { error: err.message, code: err.code, feature: err.feature },
              err.status,
            );
          }
          reportServerError(err, { route: "/api/analyze" });
          const message =
            err instanceof Error ? err.message : "Não foi possível concluir a análise.";
          return json({ error: message }, 502);
        }
      },
    },
  },
});
