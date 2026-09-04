#!/usr/bin/env node
const secret = process.env.PUSH_CRON_SECRET || process.env.NEWS_CRON_SECRET || "";
function resolveUrl() {
  if (process.env.OPENING_SCAN_URL) return process.env.OPENING_SCAN_URL;
  const base =
    process.env.PUBLIC_APP_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null);
  if (!base) {
    console.error("[opening-scan-cron] Defina OPENING_SCAN_URL ou PUBLIC_APP_URL");
    process.exit(1);
  }
  return `${base.replace(/\/$/, "")}/api/push/opening-scan`;
}
const url = resolveUrl();
async function main() {
  console.log(`[opening-scan-cron] POST ${url}`);
  const headers = { "Content-Type": "application/json" };
  if (secret) headers["X-Cron-Secret"] = secret;
  const res = await fetch(url, { method: "POST", headers, body: "{}" });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  console.log(`[opening-scan-cron] status=${res.status}`, body);
  if (!res.ok) process.exit(1);
}
main().catch((err) => { console.error("[opening-scan-cron] fatal:", err); process.exit(1); });
