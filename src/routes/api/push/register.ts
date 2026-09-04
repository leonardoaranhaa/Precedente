import { createFileRoute } from "@tanstack/react-router";
import { DEFAULT_ALERT_RULES, type AlertRules, type WatchTarget } from "@/lib/push/types";
import { removeSubscription, subscriptionCount, upsertSubscription } from "@/lib/push/store";
import { TIMEFRAMES, type Timeframe } from "@/lib/market/types";
import { normalizeTicker } from "@/lib/market/labels";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import {
  assertPremiumFeatureForUser,
  PremiumQuotaError,
  PremiumRequiredError,
  watchesHaveEnabledZones,
} from "@/lib/billing/assert-premium.server";
import { getSessionUser } from "@/lib/auth/verify.server";

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 5 * 60 * 1000;

const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
      priceZone: r.priceZone as WatchTarget["priceZone"],
      rsiZone: r.rsiZone as WatchTarget["rsiZone"],
    });
  }
  return out.slice(0, 24);
}

function parseRules(raw: unknown): Partial<AlertRules> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const out: Partial<AlertRules> = {};
  if (typeof r.sampleWeak === "boolean") out.sampleWeak = r.sampleWeak;
  if (typeof r.sampleRegime === "boolean") out.sampleRegime = r.sampleRegime;
  if (typeof r.drawdownPath === "boolean") out.drawdownPath = r.drawdownPath;
  if (typeof r.extreme20 === "boolean") out.extreme20 = r.extreme20;
  if (typeof r.drawdownThresholdPct === "number" && Number.isFinite(r.drawdownThresholdPct)) {
    out.drawdownThresholdPct = Math.min(50, Math.max(1, r.drawdownThresholdPct));
  }
  if (typeof r.fundingExtreme === "boolean") out.fundingExtreme = r.fundingExtreme;
  if (typeof r.fundingThreshold === "number" && Number.isFinite(r.fundingThreshold)) {
    out.fundingThreshold = Math.min(0.05, Math.max(0.00005, r.fundingThreshold));
  }
  if (typeof r.volumeAnomaly === "boolean") out.volumeAnomaly = r.volumeAnomaly;
  if (typeof r.volumeMultiple === "number" && Number.isFinite(r.volumeMultiple)) {
    out.volumeMultiple = Math.min(20, Math.max(1.5, r.volumeMultiple));
  }
  return out;
}

export const Route = createFileRoute("/api/push/register")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const limit = checkRateLimit(`push-register:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
        if (!limit.allowed) {
          return json({ error: "Muitas tentativas. Tente de novo em instantes." }, 429);
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "JSON inválido." }, 400);
        }
        const raw = body as Record<string, unknown>;
        const token = typeof raw.token === "string" ? raw.token : "";
        if (token && !EXPO_TOKEN_RE.test(token)) {
          return json({ error: "Token de push em formato inválido." }, 400);
        }

        const watches = parseWatches(raw.watches);

        let sessionUserId: string | null = null;
        try {
          const session = await getSessionUser();
          sessionUserId = session?.id ?? null;
          await assertPremiumFeatureForUser(sessionUserId, "watch_slot", {
            watchCount: watches.length,
          });
          await assertPremiumFeatureForUser(sessionUserId, "zones", {
            hasEnabledZones: watchesHaveEnabledZones(watches),
          });
        } catch (err) {
          if (err instanceof PremiumRequiredError || err instanceof PremiumQuotaError) {
            return json(
              { error: err.message, code: err.code, feature: err.feature },
              err.status,
            );
          }
          throw err;
        }

        try {
          const sub = await upsertSubscription({
            token,
            platform: typeof raw.platform === "string" ? raw.platform : undefined,
            watches,
            rules: parseRules(raw.rules) ?? DEFAULT_ALERT_RULES,
            digestEnabled: typeof raw.digestEnabled === "boolean" ? raw.digestEnabled : undefined,
            digestHourUtc: typeof raw.digestHourUtc === "number" ? raw.digestHourUtc : undefined,
            includeMovers: typeof raw.includeMovers === "boolean" ? raw.includeMovers : undefined,
            userId: sessionUserId,
          });
          return json({
            ok: true,
            watches: sub.watches.length,
            rules: sub.rules,
            digestEnabled: sub.digestEnabled,
            digestHourUtc: sub.digestHourUtc,
            includeMovers: sub.includeMovers,
            subscribers: await subscriptionCount(),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Falha no registro.";
          return json({ error: message }, 400);
        }
      },
      DELETE: async ({ request }) => {
        const limit = checkRateLimit(`push-register:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
        if (!limit.allowed) {
          return json({ error: "Muitas tentativas. Tente de novo em instantes." }, 429);
        }

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
        await removeSubscription(token);
        return json({ ok: true, subscribers: await subscriptionCount() });
      },
    },
  },
});
