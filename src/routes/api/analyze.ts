import { createFileRoute } from "@tanstack/react-router";
import { runAnalysis, validateAnalyzeInput } from "@/lib/analyze";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// Liberado para qualquer origem: o app mobile (Expo) chama este endpoint
// diretamente de fora do navegador, sem cabeçalho Origin previsível.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Cada chamada com print gasta a chave paga da Anthropic Vision; sem isso
// um script externo (endpoint sem auth, CORS *) pode martelar a cota do dono.
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 5 * 60 * 1000;

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
        const limit = checkRateLimit(`analyze:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
        if (!limit.allowed) {
          return json(
            { error: "Muitas análises em pouco tempo. Tente de novo em instantes." },
            429,
          );
        }

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
          const message =
            err instanceof Error ? err.message : "Não foi possível concluir a análise.";
          return json({ error: message }, 502);
        }
      },
    },
  },
});
