import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getAllBreakerStates } from "@/lib/circuit-breaker";

/**
 * Agregação mínima sobre analysis_log — responde "quantas análises (e leituras
 * de print) rodaram nos últimos N dias e quanto isso custou" sem abrir código.
 * Mesmo padrão de auth por segredo compartilhado do /api/push/scan.
 */
function authorized(request: Request): boolean {
  const secret = process.env.OPS_SECRET;
  if (!secret) return false; // sem segredo configurado, endpoint fica fechado
  const header =
    request.headers.get("x-ops-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/ops/analysis")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) {
          return json({ error: "Não autorizado." }, 401);
        }

        const url = new URL(request.url);
        const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 7));

        const sql = await getSql();

        const summaryRows = await sql.query<{
          total: string;
          vision_count: string;
          vision_cost_usd: string;
        }>(
          `select
             count(*)::text as total,
             count(*) filter (where has_image)::text as vision_count,
             coalesce(sum(vision_cost_usd), 0)::text as vision_cost_usd
           from analysis_log
           where created_at > now() - make_interval(days => $1::int)`,
          [days],
        );
        const summary = summaryRows[0];

        const topTickers = await sql.query<{ ticker: string; count: string }>(
          `select ticker, count(*)::text as count
           from analysis_log
           where created_at > now() - make_interval(days => $1::int)
           group by ticker
           order by count(*) desc
           limit 10`,
          [days],
        );

        return json({
          days,
          total: Number(summary?.total ?? 0),
          visionCount: Number(summary?.vision_count ?? 0),
          visionCostUsd: Number(summary?.vision_cost_usd ?? 0),
          topTickers: topTickers.map((r) => ({ ticker: r.ticker, count: Number(r.count) })),
          circuits: getAllBreakerStates(),
        });
      },
    },
  },
});
