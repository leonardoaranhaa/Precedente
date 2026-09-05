#!/usr/bin/env node
const secret = process.env.PUSH_CRON_SECRET || process.env.NEWS_CRON_SECRET || "";

function resolveUrl() {
  if (process.env.DEX_DRAIN_SCAN_URL) return process.env.DEX_DRAIN_SCAN_URL;
  const base =
    process.env.PUBLIC_APP_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : null);
  if (!base) {
    console.error("[dex-drain-scan-cron] Defina DEX_DRAIN_SCAN_URL ou PUBLIC_APP_URL");
    process.exit(1);
  }
  return `${base.replace(/\/$/, "")}/api/push/dex-drain-scan`;
}

const url = resolveUrl();

async function main() {
  console.log(`[dex-drain-scan-cron] POST ${url}`);
  const headers = { "Content-Type": "application/json" };
  if (secret) headers["X-Cron-Secret"] = secret;
  const res = await fetch(url, { method: "POST", headers, body: "{}", signal: AbortSignal.timeout(30_000) });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  console.log(`[dex-drain-scan-cron] status=${res.status}`, body);
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error("[dex-drain-scan-cron] fatal:", err);
  process.exit(1);
});
