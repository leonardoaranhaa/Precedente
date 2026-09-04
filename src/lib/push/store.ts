import { getSql } from "@/lib/db";
import type { AlertRules, PushSubscription, WatchTarget } from "./types";
import { DEFAULT_ALERT_RULES, DEFAULT_DIGEST, MAX_DEX_WATCHES } from "./types";
import { sanitizeDexTicker, sanitizeWatchTarget } from "./sanitize";

export { sanitizeWatchTarget } from "./sanitize";

const memory = new Map<string, PushSubscription>();
const MAX_WATCHES = 24;

type Row = {
  token: string;
  platform: string;
  watches: unknown;
  rules: unknown;
  last_sent: unknown;
  updated_at: string | Date;
  digest_enabled?: unknown;
  digest_hour_utc?: unknown;
  include_movers?: unknown;
  last_digest_at?: unknown;
  user_id?: unknown;
  dex_watches?: unknown;
  daily_summary_enabled?: unknown;
};

function asObject(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      if (p && typeof p === "object" && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }
  return {};
}

function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return [];
}

function parseDigestHour(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return DEFAULT_DIGEST.digestHourUtc;
  const h = Math.trunc(n);
  return h >= 0 && h <= 23 ? h : DEFAULT_DIGEST.digestHourUtc;
}

function parseLastDigestAt(v: unknown): number | null {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string" || typeof v === "number") {
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

function rowToSub(row: Row): PushSubscription {
  const rulesRaw = asObject(row.rules);
  const lastSentRaw = asObject(row.last_sent);
  const watches = asArray(row.watches)
    .filter((w): w is WatchTarget => Boolean(w && typeof w === "object"))
    .map((w) => sanitizeWatchTarget(w as WatchTarget));
  const dexWatches = asArray(row.dex_watches)
    .map((t) => sanitizeDexTicker(t))
    .filter((t): t is string => t != null)
    .slice(0, MAX_DEX_WATCHES);

  const lastSent: Record<string, number> = {};
  for (const [k, v] of Object.entries(lastSentRaw)) {
    if (typeof v === "number" && Number.isFinite(v)) lastSent[k] = v;
  }

  const updatedAt =
    row.updated_at instanceof Date
      ? row.updated_at.getTime()
      : Date.parse(String(row.updated_at)) || Date.now();

  return {
    token: row.token,
    platform:
      row.platform === "ios" || row.platform === "android" || row.platform === "web"
        ? row.platform
        : "unknown",
    watches,
    rules: {
      ...DEFAULT_ALERT_RULES,
      ...(typeof rulesRaw.sampleWeak === "boolean" ? { sampleWeak: rulesRaw.sampleWeak } : {}),
      ...(typeof rulesRaw.sampleRegime === "boolean" ? { sampleRegime: rulesRaw.sampleRegime } : {}),
      ...(typeof rulesRaw.drawdownPath === "boolean" ? { drawdownPath: rulesRaw.drawdownPath } : {}),
      ...(typeof rulesRaw.extreme20 === "boolean" ? { extreme20: rulesRaw.extreme20 } : {}),
      ...(typeof rulesRaw.drawdownThresholdPct === "number"
        ? { drawdownThresholdPct: rulesRaw.drawdownThresholdPct }
        : {}),
      ...(typeof rulesRaw.fundingExtreme === "boolean"
        ? { fundingExtreme: rulesRaw.fundingExtreme }
        : {}),
      ...(typeof rulesRaw.fundingThreshold === "number"
        ? { fundingThreshold: rulesRaw.fundingThreshold }
        : {}),
      ...(typeof rulesRaw.volumeAnomaly === "boolean"
        ? { volumeAnomaly: rulesRaw.volumeAnomaly }
        : {}),
      ...(typeof rulesRaw.volumeMultiple === "number"
        ? { volumeMultiple: rulesRaw.volumeMultiple }
        : {}),
    },
    updatedAt,
    lastSent,
    digestEnabled:
      typeof row.digest_enabled === "boolean" ? row.digest_enabled : DEFAULT_DIGEST.digestEnabled,
    digestHourUtc: parseDigestHour(row.digest_hour_utc),
    includeMovers:
      typeof row.include_movers === "boolean" ? row.include_movers : DEFAULT_DIGEST.includeMovers,
    lastDigestAt: parseLastDigestAt(row.last_digest_at),
    userId: typeof row.user_id === "string" && row.user_id.length > 0 ? row.user_id : null,
    dexWatches,
    dailySummaryEnabled: row.daily_summary_enabled === true,
  };
}

async function trySql<T>(fn: (sql: Awaited<ReturnType<typeof getSql>>) => Promise<T>): Promise<T | null> {
  try {
    const sql = await getSql();
    return await fn(sql);
  } catch (err) {
    console.warn("[push/store] DB indisponível, usando memória:", err);
    return null;
  }
}

export async function upsertSubscription(input: {
  token: string;
  platform?: string;
  watches?: WatchTarget[];
  dexWatches?: string[];
  dailySummaryEnabled?: boolean;
  rules?: Partial<AlertRules>;
  digestEnabled?: boolean;
  digestHourUtc?: number;
  includeMovers?: boolean;
  userId?: string | null;
}): Promise<PushSubscription> {
  const token = input.token.trim();
  if (!token || token.length < 20) {
    throw new Error("Token de push inválido.");
  }

  const existing = await getSubscription(token);
  const platform =
    input.platform === "ios" || input.platform === "android" || input.platform === "web"
      ? input.platform
      : (existing?.platform ?? "unknown");

  const watches = (input.watches ?? existing?.watches ?? [])
    .filter((w) => w.ticker && w.timeframe)
    .slice(0, MAX_WATCHES)
    .map(sanitizeWatchTarget);

  const dexWatches = (input.dexWatches ?? existing?.dexWatches ?? [])
    .map((t) => sanitizeDexTicker(t))
    .filter((t): t is string => t != null)
    .slice(0, MAX_DEX_WATCHES);

  const dailySummaryEnabled =
    typeof input.dailySummaryEnabled === "boolean"
      ? input.dailySummaryEnabled
      : (existing?.dailySummaryEnabled ?? false);

  const rules: AlertRules = {
    ...DEFAULT_ALERT_RULES,
    ...(existing?.rules ?? {}),
    ...(input.rules ?? {}),
  };

  const digestEnabled =
    typeof input.digestEnabled === "boolean"
      ? input.digestEnabled
      : (existing?.digestEnabled ?? DEFAULT_DIGEST.digestEnabled);
  const digestHourUtc =
    typeof input.digestHourUtc === "number"
      ? parseDigestHour(input.digestHourUtc)
      : (existing?.digestHourUtc ?? DEFAULT_DIGEST.digestHourUtc);
  const includeMovers =
    typeof input.includeMovers === "boolean"
      ? input.includeMovers
      : (existing?.includeMovers ?? DEFAULT_DIGEST.includeMovers);

  const userId =
    input.userId !== undefined ? input.userId : (existing?.userId ?? null);

  const sub: PushSubscription = {
    token,
    platform,
    watches,
    dexWatches,
    dailySummaryEnabled,
    rules,
    updatedAt: Date.now(),
    lastSent: existing?.lastSent ?? {},
    digestEnabled,
    digestHourUtc,
    includeMovers,
    lastDigestAt: existing?.lastDigestAt ?? null,
    userId,
  };

  const persisted = await trySql(async (sql) => {
    await sql.query(
      `INSERT INTO push_subscriptions (
         token, platform, watches, rules, last_sent, updated_at,
         digest_enabled, digest_hour_utc, include_movers, user_id, dex_watches,
         daily_summary_enabled
       )
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, now(), $6, $7, $8, $9, $10::jsonb, $11)
       ON CONFLICT (token) DO UPDATE SET
         platform = EXCLUDED.platform,
         watches = EXCLUDED.watches,
         rules = EXCLUDED.rules,
         last_sent = EXCLUDED.last_sent,
         digest_enabled = EXCLUDED.digest_enabled,
         digest_hour_utc = EXCLUDED.digest_hour_utc,
         include_movers = EXCLUDED.include_movers,
         user_id = COALESCE(EXCLUDED.user_id, push_subscriptions.user_id),
         dex_watches = EXCLUDED.dex_watches,
         daily_summary_enabled = EXCLUDED.daily_summary_enabled,
         updated_at = now()`,
      [
        sub.token,
        sub.platform,
        JSON.stringify(sub.watches),
        JSON.stringify(sub.rules),
        JSON.stringify(sub.lastSent),
        sub.digestEnabled,
        sub.digestHourUtc,
        sub.includeMovers,
        sub.userId,
        JSON.stringify(sub.dexWatches),
        sub.dailySummaryEnabled,
      ],
    );
    return sub;
  });

  memory.set(token, sub);
  return persisted ?? sub;
}

export async function getSubscription(token: string): Promise<PushSubscription | null> {
  const t = token.trim();
  const fromDb = await trySql(async (sql) => {
    const rows = await sql.query<Row>(
      `SELECT token, platform, watches, rules, last_sent, updated_at,
              digest_enabled, digest_hour_utc, include_movers, last_digest_at, user_id, dex_watches, daily_summary_enabled
       FROM push_subscriptions WHERE token = $1`,
      [t],
    );
    return rows[0] ? rowToSub(rows[0]) : null;
  });
  if (fromDb) {
    memory.set(t, fromDb);
    return fromDb;
  }
  return memory.get(t) ?? null;
}

export async function removeSubscription(token: string): Promise<boolean> {
  const t = token.trim();
  memory.delete(t);
  await trySql(async (sql) => {
    await sql.query(`DELETE FROM push_subscriptions WHERE token = $1`, [t]);
    return true;
  });
  return true;
}

export async function listSubscriptions(): Promise<PushSubscription[]> {
  const fromDb = await trySql(async (sql) => {
    const rows = await sql.query<Row>(
      `SELECT token, platform, watches, rules, last_sent, updated_at,
              digest_enabled, digest_hour_utc, include_movers, last_digest_at, user_id, dex_watches, daily_summary_enabled
       FROM push_subscriptions ORDER BY updated_at DESC`,
    );
    return rows.map(rowToSub);
  });
  if (fromDb) {
    memory.clear();
    for (const s of fromDb) memory.set(s.token, s);
    return fromDb;
  }
  return [...memory.values()];
}

export async function markSent(token: string, keys: string[], at = Date.now()): Promise<void> {
  const sub = await getSubscription(token);
  if (!sub) return;
  for (const k of keys) sub.lastSent[k] = at;
  sub.updatedAt = at;
  memory.set(token, sub);

  await trySql(async (sql) => {
    await sql.query(
      `UPDATE push_subscriptions
       SET last_sent = $2::jsonb, updated_at = now()
       WHERE token = $1`,
      [token, JSON.stringify(sub.lastSent)],
    );
    return true;
  });
}

export async function subscriptionCount(): Promise<number> {
  const fromDb = await trySql(async (sql) => {
    const rows = await sql.query<{ n: number }>(`SELECT count(*)::int AS n FROM push_subscriptions`);
    return rows[0]?.n ?? 0;
  });
  if (fromDb != null) return fromDb;
  return memory.size;
}

export async function markStateCodes(
  token: string,
  patches: { key: string; code: number }[],
): Promise<void> {
  if (patches.length === 0) return;
  const sub = await getSubscription(token);
  if (!sub) return;
  for (const p of patches) {
    sub.lastSent[p.key] = p.code;
  }
  sub.updatedAt = Date.now();
  memory.set(token, sub);

  await trySql(async (sql) => {
    await sql.query(
      `UPDATE push_subscriptions
       SET last_sent = $2::jsonb, updated_at = now()
       WHERE token = $1`,
      [token, JSON.stringify(sub.lastSent)],
    );
    return true;
  });
}

export async function listSubscriptionsByUserId(userId: string): Promise<PushSubscription[]> {
  const uid = userId.trim();
  if (!uid) return [];
  const fromDb = await trySql(async (sql) => {
    const rows = await sql.query<Row>(
      `SELECT token, platform, watches, rules, last_sent, updated_at,
              digest_enabled, digest_hour_utc, include_movers, last_digest_at, user_id, dex_watches, daily_summary_enabled
       FROM push_subscriptions WHERE user_id = $1 ORDER BY updated_at DESC`,
      [uid],
    );
    return rows.map(rowToSub);
  });
  if (fromDb) return fromDb;
  return [...memory.values()].filter((s) => s.userId === uid);
}
