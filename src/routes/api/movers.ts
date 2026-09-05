import { createFileRoute } from "@tanstack/react-router";
import { fetchMovers24h } from "@/lib/market/movers-24h";
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
      "Cache-Control": "public, max-age=60",
      ...CORS_HEADERS,
    },
  });
}

export const Route = createFileRoute("/api/movers")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const limit_ = checkRateLimit(`movers:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
        if (!limit_.allowed) {
          return json({ error: "Muitas tentativas. Tente de novo em instantes." }, 429);
        }

        const raw = new URL(request.url).searchParams.get("top");
        const parsed = Number(raw);
        const top =
          Number.isFinite(parsed) && parsed >= 1 && parsed <= 100 ? Math.floor(parsed) : 20;

        try {
          const snap = await fetchMovers24h({ top, minQuoteVolume: 100_000 });
          return json(snap);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Não foi possível ler os movers agora.";
          return json({ error: message }, 502);
        }
      },
    },
  },
});
