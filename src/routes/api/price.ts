import { createFileRoute } from "@tanstack/react-router";
import { fetchLivePrice } from "@/lib/market/live-price";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// Alto de propósito: é um poll a cada poucos segundos por tela aberta,
// bem mais frequente que analyze/universe — mas a resposta é minúscula
// e cacheada por 2s (live-price.ts), então o custo real por request é baixo.
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 5 * 60 * 1000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SYMBOL_RE = /^[A-Z0-9]{5,20}$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export const Route = createFileRoute("/api/price")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const limit_ = checkRateLimit(`price:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
        if (!limit_.allowed) {
          return json({ error: "Muitas tentativas. Tente de novo em instantes." }, 429);
        }

        const symbol = new URL(request.url).searchParams.get("symbol")?.toUpperCase() ?? "";
        if (!SYMBOL_RE.test(symbol)) {
          return json({ error: "Símbolo inválido." }, 400);
        }

        try {
          const price = await fetchLivePrice(symbol);
          return json({ symbol, price, at: Date.now() });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Preço indisponível agora.";
          const knownStatus =
            err instanceof Error && "status" in err && typeof err.status === "number"
              ? err.status
              : undefined;
          const status =
            knownStatus ?? (err instanceof Error && err.message.includes("não encontrado") ? 404 : 502);
          return json({ error: message }, status);
        }
      },
    },
  },
});
