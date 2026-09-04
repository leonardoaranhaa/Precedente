import { getSql } from "@/lib/db";
import type { AlertRules, PushSubscription, WatchTarget } from "./types";
import { DEFAULT_ALERT_RULES } from "./types";
import { sanitizeWatchTarget } from "./sanitize";

export { sanitizeWatchTarget } from "./sanitize";

/**
 * Persistência preferencial em Postgres (Neon / PGLite via getSql).
 * Fallback em memória se o DB não estiver disponível — o mobile re-registra ao abrir.
 */
const memory = new Map<string, PushSubscription>();

const MAX_WATCHES = 24;

type Row = {
  token: string;
  platform: string;
  watches: unknown;
  rules: unknown;
  last_sent: unknown;
  updated_at: string | Date;
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

function rowToSub(row: Row): PushSubscription {
  const rulesRaw = asObject(row.rules);
  const lastSentRaw = asObject(row.last_sent);
  const watches = asArray(row.watches)
    .filter((w): w is WatchTarget => Boolean(w && typeof w === "object"))
    .map((w) => sanitizeWatchTarget(w as WatchTarget));

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
      ...(typeof rulesRaw.drawdownPath === "boolean"
        ? { drawdownPath: rulesRaw.drawdownPath }
        : {}),
      ...(typeof rulesRaw.extreme20 === "boolean" ? { extreme20: rulesRaw.extreme20 } : {}),
      ...(typeof rulesRaw.drawdownThresholdPct === "number"
        ? { drawdownThresholdPct: rulesRaw.drawdownThresholdPct }
        : {}),
    },
    updatedAt,
    lastSent,
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
  rules?: Partial<AlertRules>;
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

  const rules: AlertRules = {
    ...DEFAULT_ALERT_RULES,
    ...(existing?.rules ?? {}),
    ...(input.rules ?? {}),
  };

  const sub: PushSubscription = {
    token,
    platform,
    watches,
    rules,
    updatedAt: Date.now(),
    lastSent: existing?.lastSent ?? {},
  };

  const persisted = await trySql(async (sql) => {
    await sql.query(
      `INSERT INTO push_subscriptions (token, platform, watches, rules, last_sent, updated_at)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, now())
       ON CONFLICT (token) DO UPDATE SET
         platform = EXCLUDED.platform,
         watches = EXCLUDED.watches,
         rules = EXCLUDED.rules,
         last_sent = EXCLUDED.last_sent,
         updated_at = now()`,
      [
        sub.token,
        sub.platform,
        JSON.stringify(sub.watches),
        JSON.stringify(sub.rules),
        JSON.stringify(sub.lastSent),
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
      `SELECT token, platform, watches, rules, last_sent, updated_at
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
  const ok = await trySql(async (sql) => {
    await sql.query(`DELETE FROM push_subscriptions WHERE token = $1`, [t]);
    return true;
  });
  return ok !== null ? true : true;
}

export async function listSubscriptions(): Promise<PushSubscription[]> {
  const fromDb = await trySql(async (sql) => {
    const rows = await sql.query<Row>(
      `SELECT token, platform, watches, rules, last_sent, updated_at
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
