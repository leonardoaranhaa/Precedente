#!/usr/bin/env node
/**
 * Cron worker do Precedente — reanalisa watches e dispara push.
 *
 * Uso no Railway (serviço separado com Cron Schedule):
 *   Start Command: node scripts/push-scan-cron.mjs
 *   Cron Schedule: */30 * * * *   (UTC, mín. 5 min)
 *
 * Variáveis:
 *   SCAN_URL          — default: $RAILWAY_PUBLIC_DOMAIN + /api/push/scan
 *                       ou PUBLIC_APP_URL + /api/push/scan
 *   PUSH_CRON_SECRET  — enviado em X-Cron-Secret (obrigatório em prod)
 *
 * O processo DEVE terminar (exit). Se ficar vivo, o próximo cron é pulado.
 */

const secret = process.env.PUSH_CRON_SECRET ?? "";

function resolveScanUrl() {
  if (process.env.SCAN_URL) return process.env.SCAN_URL;
  const base =
    process.env.PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : null);
  if (!base) {
    console.error(
      "[push-scan-cron] Defina SCAN_URL ou PUBLIC_APP_URL / RAILWAY_PUBLIC_DOMAIN",
    );
    process.exit(1);
  }
  return `${base.replace(/\/$/, "")}/api/push/scan`;
}

const url = resolveScanUrl();

const headers = {
  "Content-Type": "application/json",
  Accept: "application/json",
};
if (secret) {
  headers["X-Cron-Secret"] = secret;
}

const started = Date.now();
console.log(`[push-scan-cron] POST ${url}`);

let res;
try {
  res = await fetch(url, {
    method: "POST",
    headers,
    body: "{}",
  });
} catch (err) {
  console.error("[push-scan-cron] rede:", err?.message ?? err);
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
  console.error(`[push-scan-cron] HTTP ${res.status} (${ms}ms)`, body);
  process.exit(1);
}

console.log(`[push-scan-cron] ok (${ms}ms)`, {
  subscribers: body.subscribers,
  analyzed: body.analyzed,
  alerts: body.alerts,
  sentOk: body.sentOk,
  sentFailed: body.sentFailed,
  errors: body.errors?.length ? body.errors : undefined,
});

process.exit(0);
