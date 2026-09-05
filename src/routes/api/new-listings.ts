import { createFileRoute } from "@tanstack/react-router";
import { fetchNewListings } from "@/lib/market/new-listings";
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

export const Route = createFileRoute("/api/new-listings")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const limit_ = checkRateLimit(
          `new-listings:${clientIp(request)}`,
          RATE_LIMIT,
          RATE_WINDOW_MS,
        );
        if (!limit_.allowed) {
          return json({ error: "Muitas tentativas. Tente de novo em instantes." }, 429);
        }

        try {
          return json(await fetchNewListings());
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Não foi possível ler novas listagens.";
          return json({ error: message }, 502);
        }
      },
    },
  },
});
