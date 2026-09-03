#!/usr/bin/env node
/**
 * Cron — digest diário da watch + movers 24h.
 *
 * Railway:
 *   Start Command: node scripts/watch-digest-cron.mjs
 *   Cron Schedule: 0 * * * *  (hora UTC; só envia na hora configurada)
 *
 * Vars: PUSH_CRON_SECRET, PUBLIC_APP_URL / RAILWAY_PUBLIC_DOMAIN
 */

const secret = process.env.PUSH_CRON_SECRET ?? process.env.NEWS_CRON_SECRET ?? "";

function resolveUrl() {
  if (process.env.WATCH_DIGEST_SCAN_URL) return process.env.WATCH_DIGEST_SCAN_URL;
  const base =
    process.env.PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : null);
  if (!base) {
    console.error("[watch-digest-cron] Defina WATCH_DIGEST_SCAN_URL ou PUBLIC_APP_URL");
    process.exit(1);
  }
  return `${base.replace(/\/$/, "")}/api/push/digest-scan`;
}

const url = resolveUrl();

async function main() {
  console.log(`[watch-digest-cron] POST ${url}`);
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
  console.log(`[watch-digest-cron] status=${res.status}`, body);
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error("[watch-digest-cron] fatal:", err);
  process.exit(1);
});
