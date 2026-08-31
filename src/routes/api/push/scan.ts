import { createFileRoute } from "@tanstack/react-router";
import { scanAllSubscriptions } from "@/lib/push/scan";
import { subscriptionCount } from "@/lib/push/store";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Cron-Secret",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function authorized(request: Request): boolean {
  const secret = process.env.PUSH_CRON_SECRET;
  // Sem secret configurado: permite em dev (útil em testes locais).
  if (!secret) return true;
  const header =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

export const Route = createFileRoute("/api/push/scan")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        if (!authorized(request)) {
          return json({ error: "Não autorizado." }, 401);
        }
        try {
          const report = await scanAllSubscriptions();
          return json({ ok: true, subscribers: subscriptionCount(), ...report });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Falha no scan.";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
