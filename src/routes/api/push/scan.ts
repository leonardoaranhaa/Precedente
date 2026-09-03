import { createFileRoute } from "@tanstack/react-router";
import { scanAllSubscriptions } from "@/lib/push/scan";
import { subscriptionCount } from "@/lib/push/store";
import { dbSource } from "@/lib/db";
import { reportServerError, reportServerMessage } from "@/lib/sentry.server";

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
  if (!secret) {
    // No secret configured: fine on the local/preview PGLite fallback (no
    // real subscribers to spam), but a real deploy (DATABASE_URL set) that
    // forgot to set the secret must not leave "push everyone now" world
    // callable — fail closed there instead of silently allowing it.
    return dbSource !== "neon";
  }
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
          if (report.errors.length > 0) {
            // Retorna 200 (o scan como um todo rodou) mas isso não pode ficar
            // invisível: sem reportar, um par saindo do ar (dados de mercado,
            // Expo) some silenciosamente dentro de um "ok: true".
            const allFailed = report.analyzed > 0 && report.errors.length >= report.analyzed;
            reportServerMessage(
              `push scan: ${report.errors.length} erro(s) — ${report.errors.slice(0, 5).join(" | ")}`,
              allFailed ? "error" : "warning",
              { route: "/api/push/scan", allFailed: String(allFailed) },
            );
          }
          return json({ ok: true, subscribers: await subscriptionCount(), ...report });
        } catch (err) {
          reportServerError(err, { route: "/api/push/scan" });
          const message = err instanceof Error ? err.message : "Falha no scan.";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
