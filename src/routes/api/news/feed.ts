import { createFileRoute } from "@tanstack/react-router";
import { fetchNewsFeed } from "@/lib/news/aggregate";
import { filterNewsForPreferences } from "@/lib/news/filter";
import { getNewsPreferences } from "@/lib/news/store";
import { getSessionUser } from "@/lib/auth/verify.server";
import type { NewsCategory, NewsPreferences } from "@/lib/news/types";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { reportServerError } from "@/lib/sentry.server";

/**
 * PROTÓTIPO — sem link em nenhuma tela ainda. Feed agregado de RSS público
 * (sem LLM, sem custo por chamada), filtrado por preferências. Aceita
 * `?coins=BTC,ETH&categories=regulatory,market` pra filtrar sem estar
 * logado (útil pra testar); logado e sem querystring, usa as preferências
 * salvas do usuário.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const KNOWN_CATEGORIES: NewsCategory[] = [
  "regulatory",
  "market",
  "security",
  "institutional",
  "technology",
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function parseListParam(value: string | null, caseFn: (s: string) => string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => caseFn(s.trim()))
    .filter(Boolean);
}

export const Route = createFileRoute("/api/news/feed")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const limit = checkRateLimit(`news-feed:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
        if (!limit.allowed) {
          return json({ error: "Muitas requisições. Tente de novo em instantes." }, 429);
        }

        const url = new URL(request.url);
        const coinsParam = url.searchParams.get("coins");
        const categoriesParam = url.searchParams.get("categories");

        let prefs: NewsPreferences;
        if (coinsParam != null || categoriesParam != null) {
          const categories = parseListParam(categoriesParam, (s) => s.toLowerCase()).filter(
            (c): c is NewsCategory => (KNOWN_CATEGORIES as string[]).includes(c),
          );
          prefs = { coins: parseListParam(coinsParam, (s) => s.toUpperCase()), categories };
        } else {
          const user = await getSessionUser();
          prefs = user ? await getNewsPreferences(user.id) : { coins: [], categories: [] };
        }

        try {
          const all = await fetchNewsFeed();
          const filtered = filterNewsForPreferences(all, prefs);
          return json({ items: filtered.slice(0, 60), total: all.length, matched: filtered.length });
        } catch (err) {
          reportServerError(err, { route: "/api/news/feed" });
          const message = err instanceof Error ? err.message : "Não foi possível buscar notícias.";
          return json({ error: message }, 502);
        }
      },
    },
  },
});
