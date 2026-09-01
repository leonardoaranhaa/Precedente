import { createFileRoute } from "@tanstack/react-router";
import { fetchTopTraded } from "@/lib/market/universe";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const RATE_LIMIT = 30;
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
      // O ranking muda devagar; um minuto de cache poupa a Binance de uma
      // requisição por abertura de app.
      "Cache-Control": "public, max-age=60",
      ...CORS_HEADERS,
    },
  });
}

export const Route = createFileRoute("/api/universe")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const limit_ = checkRateLimit(`universe:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
        if (!limit_.allowed) {
          return json({ error: "Muitas tentativas. Tente de novo em instantes." }, 429);
        }

        const raw = new URL(request.url).searchParams.get("limit");
        const parsed = Number(raw);
        const limit =
          Number.isFinite(parsed) && parsed >= 1 && parsed <= 50 ? Math.floor(parsed) : 12;

        try {
          return json({ pairs: await fetchTopTraded(limit) });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Não foi possível ler o volume agora.";
          return json({ error: message }, 502);
        }
      },
    },
  },
});
