import { createFileRoute } from "@tanstack/react-router";
import { fetchTopTraded } from "@/lib/market/universe";

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
