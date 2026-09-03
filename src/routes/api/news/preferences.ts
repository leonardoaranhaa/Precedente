import { createFileRoute } from "@tanstack/react-router";
import { getNewsPreferences, setNewsPreferences } from "@/lib/news/store";
import { requireUserId, UnauthorizedError } from "@/lib/auth/verify.server";
import { reportServerError } from "@/lib/sentry.server";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * PROTÓTIPO — sem link em nenhuma tela ainda. Preferências de notícia por
 * usuário: quais moedas e categorias ele quer ver. Sem custo de LLM (ao
 * contrário do agente de busca externa) — não precisa de gate de premium.
 */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 5 * 60 * 1000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export const Route = createFileRoute("/api/news/preferences")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () => {
        let userId: string;
        try {
          userId = await requireUserId();
        } catch (err) {
          if (err instanceof UnauthorizedError) return json({ error: "Não autorizado." }, 401);
          throw err;
        }
        const limit = checkRateLimit(`news-prefs:${userId}`, RATE_LIMIT, RATE_WINDOW_MS);
        if (!limit.allowed) {
          return json({ error: "Muitas requisições. Tente de novo em instantes." }, 429);
        }
        const prefs = await getNewsPreferences(userId);
        return json(prefs);
      },
      POST: async ({ request }) => {
        let userId: string;
        try {
          userId = await requireUserId();
        } catch (err) {
          if (err instanceof UnauthorizedError) return json({ error: "Não autorizado." }, 401);
          throw err;
        }
        const limit = checkRateLimit(`news-prefs:${userId}`, RATE_LIMIT, RATE_WINDOW_MS);
        if (!limit.allowed) {
          return json({ error: "Muitas requisições. Tente de novo em instantes." }, 429);
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Corpo da requisição inválido (esperado JSON)." }, 400);
        }

        try {
          const prefs = await setNewsPreferences(userId, body);
          return json(prefs);
        } catch (err) {
          reportServerError(err, { route: "/api/news/preferences" });
          const message = err instanceof Error ? err.message : "Não foi possível salvar.";
          return json({ error: message }, 502);
        }
      },
    },
  },
});
