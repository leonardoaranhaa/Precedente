#!/usr/bin/env node
/**
 * Probe RSS feeds. Exit 1 se todos falharem (alerta no Railway).
 * Uso: node scripts/rss-health-cron.mjs
 * Opcional: HEALTH_URL=https://app.../api/news/health
 */
const url =
  process.env.HEALTH_URL ||
  (process.env.PUBLIC_APP_URL
    ? `${process.env.PUBLIC_APP_URL.replace(/\/$/, "")}/api/news/health`
    : null);

async function main() {
  if (url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    const body = await res.text();
    console.log("[rss-health]", res.status, body.slice(0, 500));
    if (!res.ok) process.exit(1);
    return;
  }
  console.error("[rss-health] Defina HEALTH_URL ou PUBLIC_APP_URL");
  process.exit(2);
}

main().catch((err) => {
  console.error("[rss-health]", err);
  process.exit(1);
});
