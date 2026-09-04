import { createFileRoute } from "@tanstack/react-router";
import { fetchSparkline } from "@/lib/market/sparkline";
import { TIMEFRAMES, type Timeframe } from "@/lib/market/types";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// Só o comparador chama isso, sempre poucos pares por vez (máx. 4) e sem
// poll contínuo — bem mais raro que /api/price.
const RATE_LIMIT = 60;
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

function isTimeframe(v: string): v is Timeframe {
  return (TIMEFRAMES as readonly string[]).includes(v);
}

export const Route = createFileRoute("/api/sparkline")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const limit_ = checkRateLimit(`sparkline:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
        if (!limit_.allowed) {
          return json({ error: "Muitas tentativas. Tente de novo em instantes." }, 429);
        }

        const params = new URL(request.url).searchParams;
        const symbol = params.get("symbol")?.toUpperCase() ?? "";
        const interval = params.get("interval") ?? "";
        if (!SYMBOL_RE.test(symbol)) {
          return json({ error: "Símbolo inválido." }, 400);
        }
        if (!isTimeframe(interval)) {
          return json({ error: "Tempo gráfico inválido." }, 400);
        }

        try {
          const closes = await fetchSparkline(symbol, interval);
          return json({ symbol, closes });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Série indisponível agora.";
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
