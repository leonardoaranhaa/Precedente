import { createFileRoute } from "@tanstack/react-router";
import { DEFAULT_ALERT_RULES, type AlertRules, type WatchTarget } from "@/lib/push/types";
import { removeSubscription, subscriptionCount, upsertSubscription } from "@/lib/push/store";
import { TIMEFRAMES, type Timeframe } from "@/lib/market/types";
import { normalizeTicker } from "@/lib/market/labels";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function parseWatches(raw: unknown): WatchTarget[] {
  if (!Array.isArray(raw)) return [];
  const out: WatchTarget[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const ticker = normalizeTicker(String(r.ticker ?? ""));
    const timeframe = String(r.timeframe ?? "") as Timeframe;
    if (!ticker || !TIMEFRAMES.includes(timeframe)) continue;
    out.push({
      ticker,
      timeframe,
      displayTicker: typeof r.displayTicker === "string" ? r.displayTicker : undefined,
    });
  }
  return out.slice(0, 24);
}

function parseRules(raw: unknown): Partial<AlertRules> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const out: Partial<AlertRules> = {};
  if (typeof r.sampleWeak === "boolean") out.sampleWeak = r.sampleWeak;
  if (typeof r.drawdownPath === "boolean") out.drawdownPath = r.drawdownPath;
  if (typeof r.extreme20 === "boolean") out.extreme20 = r.extreme20;
  if (typeof r.drawdownThresholdPct === "number" && Number.isFinite(r.drawdownThresholdPct)) {
    out.drawdownThresholdPct = Math.min(50, Math.max(1, r.drawdownThresholdPct));
  }
  return out;
}

export const Route = createFileRoute("/api/push/register")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "JSON inválido." }, 400);
        }
        const raw = body as Record<string, unknown>;
        const token = typeof raw.token === "string" ? raw.token : "";
        try {
          const sub = upsertSubscription({
            token,
            platform: typeof raw.platform === "string" ? raw.platform : undefined,
            watches: parseWatches(raw.watches),
            rules: parseRules(raw.rules) ?? DEFAULT_ALERT_RULES,
          });
          return json({
            ok: true,
            watches: sub.watches.length,
            rules: sub.rules,
            subscribers: subscriptionCount(),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Falha no registro.";
          return json({ error: message }, 400);
        }
      },
      DELETE: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "JSON inválido." }, 400);
        }
        const token =
          typeof (body as { token?: string }).token === "string"
            ? (body as { token: string }).token
            : "";
        const removed = removeSubscription(token);
        return json({ ok: removed, subscribers: subscriptionCount() });
      },
    },
  },
});
