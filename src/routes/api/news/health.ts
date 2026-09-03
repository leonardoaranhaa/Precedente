import { createFileRoute } from "@tanstack/react-router";
import { checkRssHealth } from "@/lib/news/rss-health";

/**
 * GET /api/news/health — status factual dos feeds RSS.
 * Público e barato; útil para uptime robot / Railway health.
 */
export const Route = createFileRoute("/api/news/health")({
  server: {
    handlers: {
      GET: async () => {
        const report = await checkRssHealth();
        return new Response(JSON.stringify(report), {
          status: report.healthy ? 200 : 503,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
