import { getSql } from "@/lib/db";
import { DEFAULT_NEWS_PREFERENCES, type NewsPreferences } from "./types";
import { sanitizePreferences } from "./sanitize";

export { sanitizePreferences } from "./sanitize";

/**
 * Mesmo padrão de `push/store.ts`: Postgres preferencial, fallback em
 * memória se o DB não estiver disponível.
 */
type StoredRow = NewsPreferences & { lastDigestAt: number | null };

const memory = new Map<string, StoredRow>();

async function trySql<T>(fn: (sql: Awaited<ReturnType<typeof getSql>>) => Promise<T>): Promise<T | null> {
  try {
    const sql = await getSql();
    return await fn(sql);
  } catch (err) {
    console.warn("[news/store] DB indisponível, usando memória:", err);
    return null;
  }
}

function rowToPrefs(row: {
  coins: unknown;
  categories: unknown;
  digest_enabled?: unknown;
  digest_hour_utc?: unknown;
  digest_tokens?: unknown;
  last_digest_at?: unknown;
}): StoredRow {
  const prefs = sanitizePreferences({
    coins: row.coins,
    categories: row.categories,
    digestEnabled: row.digest_enabled,
    digestHourUtc: row.digest_hour_utc,
    digestTokens: row.digest_tokens,
  });
  let lastDigestAt: number | null = null;
  if (row.last_digest_at instanceof Date) {
    lastDigestAt = row.last_digest_at.getTime();
  } else if (typeof row.last_digest_at === "string" || typeof row.last_digest_at === "number") {
    const t = new Date(row.last_digest_at).getTime();
    if (Number.isFinite(t)) lastDigestAt = t;
  }
  return { ...prefs, lastDigestAt };
}

export async function getNewsPreferences(userId: string): Promise<NewsPreferences> {
  const fromDb = await trySql(async (sql) => {
    const rows = await sql.query<{
      coins: unknown;
      categories: unknown;
      digest_enabled: unknown;
      digest_hour_utc: unknown;
      digest_tokens: unknown;
      last_digest_at: unknown;
    }>(
      `SELECT coins, categories, digest_enabled, digest_hour_utc, digest_tokens, last_digest_at
       FROM user_news_preferences WHERE user_id = $1`,
      [userId],
    );
    return rows[0] ? rowToPrefs(rows[0]) : null;
  });
  if (fromDb) {
    memory.set(userId, fromDb);
    const { lastDigestAt: _, ...prefs } = fromDb;
    return prefs;
  }
  const mem = memory.get(userId);
  if (mem) {
    const { lastDigestAt: _, ...prefs } = mem;
    return prefs;
  }
  return { ...DEFAULT_NEWS_PREFERENCES };
}

export async function setNewsPreferences(
  userId: string,
  input: unknown,
): Promise<NewsPreferences> {
  const prefs = sanitizePreferences(input);
  const prev = memory.get(userId);
  memory.set(userId, { ...prefs, lastDigestAt: prev?.lastDigestAt ?? null });

  await trySql(async (sql) => {
    await sql.query(
      `INSERT INTO user_news_preferences (
         user_id, coins, categories, digest_enabled, digest_hour_utc, digest_tokens, updated_at
       )
       VALUES ($1, $2::jsonb, $3::jsonb, $4, $5, $6::jsonb, now())
       ON CONFLICT (user_id) DO UPDATE SET
         coins = EXCLUDED.coins,
         categories = EXCLUDED.categories,
         digest_enabled = EXCLUDED.digest_enabled,
         digest_hour_utc = EXCLUDED.digest_hour_utc,
         digest_tokens = EXCLUDED.digest_tokens,
         updated_at = now()`,
      [
        userId,
        JSON.stringify(prefs.coins),
        JSON.stringify(prefs.categories),
        prefs.digestEnabled,
        prefs.digestHourUtc,
        JSON.stringify(prefs.digestTokens),
      ],
    );
    return true;
  });

  return prefs;
}

export type DigestSubscriber = {
  userId: string;
  prefs: NewsPreferences;
  lastDigestAt: number | null;
};

/** Usuários com digest ligado (para o cron). */
export async function listDigestSubscribers(): Promise<DigestSubscriber[]> {
  const fromDb = await trySql(async (sql) => {
    const rows = await sql.query<{
      user_id: string;
      coins: unknown;
      categories: unknown;
      digest_enabled: unknown;
      digest_hour_utc: unknown;
      digest_tokens: unknown;
      last_digest_at: unknown;
    }>(
      `SELECT user_id, coins, categories, digest_enabled, digest_hour_utc, digest_tokens, last_digest_at
       FROM user_news_preferences
       WHERE digest_enabled = true`,
    );
    return rows.map((row) => {
      const stored = rowToPrefs(row);
      const { lastDigestAt, ...prefs } = stored;
      return { userId: row.user_id, prefs, lastDigestAt };
    });
  });
  if (fromDb) {
    for (const s of fromDb) {
      memory.set(s.userId, { ...s.prefs, lastDigestAt: s.lastDigestAt });
    }
    return fromDb;
  }
  const out: DigestSubscriber[] = [];
  for (const [userId, stored] of memory) {
    if (!stored.digestEnabled) continue;
    const { lastDigestAt, ...prefs } = stored;
    out.push({ userId, prefs, lastDigestAt });
  }
  return out;
}

export async function markDigestSent(userId: string, at = Date.now()): Promise<void> {
  const prev = memory.get(userId);
  if (prev) {
    memory.set(userId, { ...prev, lastDigestAt: at });
  } else {
    memory.set(userId, { ...DEFAULT_NEWS_PREFERENCES, lastDigestAt: at });
  }

  await trySql(async (sql) => {
    await sql.query(
      `UPDATE user_news_preferences
       SET last_digest_at = to_timestamp($2 / 1000.0), updated_at = now()
       WHERE user_id = $1`,
      [userId, at],
    );
    return true;
  });
}
