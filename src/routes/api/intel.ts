import { createFileRoute } from "@tanstack/react-router";
import { fetchExternalIntel, validateIntelTicker } from "@/lib/market/external-intel";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 5 * 60 * 1000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
    },
  });
}

export const Route = createFileRoute("/api/intel")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const limit_ = checkRateLimit(
          `intel:${clientIp(request)}`,
          RATE_LIMIT,
          RATE_WINDOW_MS,
        );
        if (!limit_.allowed) {
          return json({ error: "Muitas tentativas. Tente de novo em instantes." }, 429);
        }

        const url = new URL(request.url);
        const rawTicker = url.searchParams.get("ticker");
        if (!rawTicker) {
          return json({ error: "Parâmetro ticker é obrigatório." }, 400);
        }

        try {
          validateIntelTicker(rawTicker);
        } catch {
          return json({ error: "Ticker inválido." }, 400);
        }

        try {
          const result = await fetchExternalIntel(rawTicker);
          return json(result);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Não foi possível buscar contexto externo.";
          const status = message.includes("indisponível") ? 503 : 502;
          return json({ error: message }, status);
        }
      },
    },
  },
});
