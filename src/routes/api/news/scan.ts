import { createFileRoute } from "@tanstack/react-router";
import { scanNewsDigests } from "@/lib/news/digest-scan";
import { dbSource } from "@/lib/db";
import { reportServerError } from "@/lib/sentry.server";

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
  const secret = process.env.PUSH_CRON_SECRET ?? process.env.NEWS_CRON_SECRET;
  if (!secret) {
    return dbSource !== "neon";
  }
  const header =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

export const Route = createFileRoute("/api/news/scan")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        if (!authorized(request)) {
          return json({ error: "Não autorizado." }, 401);
        }
        try {
          const report = await scanNewsDigests();
          return json({ ok: true, ...report });
        } catch (err) {
          reportServerError(err, { route: "/api/news/scan" });
          const message = err instanceof Error ? err.message : "Falha no scan de digest.";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
