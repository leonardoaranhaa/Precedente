#!/usr/bin/env node
/**
 * Cron worker — digest diário de notícias (por preferências do usuário).
 *
 * Railway (serviço separado ou mesmo worker de push em horário distinto):
 *   Start Command: node scripts/news-digest-cron.mjs
 *   Cron Schedule: 0 * * * *  (a cada hora, UTC)
 *
 * Variáveis:
 *   SCAN_URL / PUBLIC_APP_URL / RAILWAY_PUBLIC_DOMAIN
 *   PUSH_CRON_SECRET (ou NEWS_CRON_SECRET) — header X-Cron-Secret
 *
 * O processo DEVE terminar (exit).
 */

const secret = process.env.PUSH_CRON_SECRET ?? process.env.NEWS_CRON_SECRET ?? "";

function resolveScanUrl() {
  if (process.env.NEWS_SCAN_URL) return process.env.NEWS_SCAN_URL;
  if (process.env.SCAN_URL?.includes("/api/news/scan")) return process.env.SCAN_URL;
  const base =
    process.env.PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : null);
  if (!base) {
    console.error(
      "[news-digest-cron] Defina NEWS_SCAN_URL ou PUBLIC_APP_URL / RAILWAY_PUBLIC_DOMAIN",
    );
    process.exit(1);
  }
  return `${base.replace(/\/$/, "")}/api/news/scan`;
}

const url = resolveScanUrl();

async function main() {
  console.log(`[news-digest-cron] POST ${url}`);
  const headers = { "Content-Type": "application/json" };
  if (secret) headers["X-Cron-Secret"] = secret;

  const res = await fetch(url, { method: "POST", headers, body: "{}" });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  console.log(`[news-digest-cron] status=${res.status}`, body);
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error("[news-digest-cron] fatal:", err);
  process.exit(1);
});
