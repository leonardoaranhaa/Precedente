#!/usr/bin/env node
/**
 * Cron worker — digest diário de notícias (estilo Grok Automations).
 *
 * Railway: serviço separado
 *   Start: node scripts/news-digest-cron.mjs
 *   Cron:  5 * * * *   (a cada hora, no minuto 5 — cobre digestHour local)
 *
 * Vars: PUSH_CRON_SECRET (ou NEWS_CRON_SECRET), PUBLIC_APP_URL / NEWS_SCAN_URL
 */

const secret = process.env.NEWS_CRON_SECRET ?? process.env.PUSH_CRON_SECRET ?? "";

function resolveUrl() {
  if (process.env.NEWS_SCAN_URL) return process.env.NEWS_SCAN_URL;
  const base =
    process.env.PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : null);
  if (!base) {
    console.error("[news-digest-cron] Defina NEWS_SCAN_URL ou PUBLIC_APP_URL");
    process.exit(1);
  }
  return `${base.replace(/\/$/, "")}/api/news/scan`;
}

const url = resolveUrl();
const headers = {
  "Content-Type": "application/json",
  Accept: "application/json",
};
if (secret) headers["X-Cron-Secret"] = secret;

const started = Date.now();
console.log(`[news-digest-cron] POST ${url}`);

let res;
try {
  res = await fetch(url, { method: "POST", headers, body: "{}" });
} catch (err) {
  console.error("[news-digest-cron] rede:", err?.message ?? err);
  process.exit(1);
}

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = { raw: text.slice(0, 500) };
}

const ms = Date.now() - started;
if (!res.ok) {
  console.error(`[news-digest-cron] HTTP ${res.status} (${ms}ms)`, body);
  process.exit(1);
}

console.log(`[news-digest-cron] ok (${ms}ms)`, {
  usersConsidered: body.usersConsidered,
  digestsCreated: body.digestsCreated,
  pushedOk: body.pushedOk,
  pushedFailed: body.pushedFailed,
  skipped: body.skipped,
  errors: body.errors?.length ? body.errors : undefined,
});
process.exit(0);
