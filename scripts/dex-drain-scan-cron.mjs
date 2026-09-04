#!/usr/bin/env node
/**
 * Cron worker: alerta de drenagem DEX.
 *
 * Uso no Railway (serviço separado com Cron Schedule):
 *   Start Command: node scripts/dex-drain-scan-cron.mjs
 *   Cron Schedule: a cada 10 minutos — ver nota abaixo sobre formato.
 *
 * Variáveis:
 *   SCAN_URL          — override completo (default: resolve via PUBLIC_APP_URL)
 *   PUSH_CRON_SECRET  — enviado em X-Cron-Secret
 */

const secret = process.env.PUSH_CRON_SECRET ?? "";

function resolveUrl() {
  if (process.env.SCAN_URL) return process.env.SCAN_URL;
  const base =
    process.env.PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : null);
  if (!base) {
    console.error("[dex-drain-cron] Defina SCAN_URL ou PUBLIC_APP_URL");
    process.exit(1);
  }
  return `${base.replace(/\/$/, "")}/api/push/dex-drain-scan`;
}

const url = resolveUrl();
const headers = { "Content-Type": "application/json", Accept: "application/json" };
if (secret) headers["X-Cron-Secret"] = secret;

const started = Date.now();
console.log(`[dex-drain-cron] POST ${url}`);

let res;
try {
  res = await fetch(url, { method: "POST", headers, body: "{}" });
} catch (err) {
  console.error("[dex-drain-cron] rede:", err?.message ?? err);
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
  console.error(`[dex-drain-cron] HTTP ${res.status} (${ms}ms)`, body);
  process.exit(1);
}

console.log(`[dex-drain-cron] ok (${ms}ms)`, {
  subscriptions: body.subscriptions,
  pairsChecked: body.pairsChecked,
  drainAlerts: body.drainAlerts,
  sent: body.sent,
  errors: body.errors?.length ? body.errors : undefined,
});

if (body.errors?.length) {
  console.error(`[dex-drain-cron] concluiu com erros`);
  process.exit(1);
}

process.exit(0);
