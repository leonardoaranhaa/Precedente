#!/usr/bin/env node
/**
 * Cron worker do Precedente — roda os três scans de push em sequência.
 *
 * 1. /api/push/scan             (alertas de prevenção)
 * 2. /api/push/dex-drain-scan   (drenagem DEX)
 * 3. /api/push/daily-summary-scan (resumo diário — tem cooldown de 20h interno)
 *
 * Uso no Railway (serviço separado com Cron Schedule):
 *   Start Command: node scripts/push-scan-cron.mjs
 *   Cron Schedule: a cada 10 min — ver expressão no dashboard
 *
 * Variáveis:
 *   PUBLIC_APP_URL    — base URL do serviço web
 *   PUSH_CRON_SECRET  — enviado em X-Cron-Secret (obrigatório em prod)
 *
 * O processo DEVE terminar (exit). Se ficar vivo, o próximo cron é pulado.
 */

const secret = process.env.PUSH_CRON_SECRET ?? "";

function resolveBase() {
  const base =
    process.env.PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : null);
  if (!base) {
    console.error(
      "[cron] Defina PUBLIC_APP_URL ou RAILWAY_PUBLIC_DOMAIN",
    );
    process.exit(1);
  }
  return base.replace(/\/$/, "");
}

const base = resolveBase();

const headers = {
  "Content-Type": "application/json",
  Accept: "application/json",
};
if (secret) {
  headers["X-Cron-Secret"] = secret;
}

async function callEndpoint(label, path) {
  const url = `${base}${path}`;
  const started = Date.now();
  console.log(`[${label}] POST ${url}`);

  let res;
  try {
    res = await fetch(url, { method: "POST", headers, body: "{}" });
  } catch (err) {
    console.error(`[${label}] rede:`, err?.message ?? err);
    return false;
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
    console.error(`[${label}] HTTP ${res.status} (${ms}ms)`, body);
    return false;
  }

  console.log(`[${label}] ok (${ms}ms)`, body);
  return true;
}

const results = [];
results.push(await callEndpoint("push-scan", "/api/push/scan"));
results.push(await callEndpoint("dex-drain", "/api/push/dex-drain-scan"));
results.push(await callEndpoint("daily-summary", "/api/push/daily-summary-scan"));

const failed = results.filter((r) => !r).length;
if (failed > 0) {
  console.error(`[cron] ${failed}/${results.length} endpoint(s) falharam`);
  process.exit(1);
}

console.log("[cron] todos os endpoints ok");
process.exit(0);
