import { getSql } from "@/lib/db";
import { DEFAULT_NEWS_PREFERENCES, type NewsPreferences } from "./types";
import { sanitizePreferences } from "./sanitize";

export { sanitizePreferences } from "./sanitize";

const memory = new Map<string, NewsPreferences>();

async function trySql<T>(fn: (sql: Awaited<ReturnType<typeof getSql>>) => Promise<T>): Promise<T | null> {
  try {
    const sql = await getSql();
    return await fn(sql);
  } catch (err) {
    console.warn("[news/store] DB indisponível, usando memória:", err);
    return null;
  }
}

function rowToPrefs(row: Record<string, unknown>): NewsPreferences {
  return sanitizePreferences({
    coins: row.coins,
    categories: row.categories,
    digestEnabled: row.digest_enabled,
    digestHour: row.digest_hour,
    timezone: row.timezone,
    pushEnabled: row.push_enabled,
    pushToken: row.push_token,
  });
}

export async function getNewsPreferences(userId: string): Promise<NewsPreferences> {
  const fromDb = await trySql(async (sql) => {
    const rows = await sql.query<Record<string, unknown>>(
      `SELECT coins, categories,
              digest_enabled, digest_hour, timezone, push_enabled, push_token
       FROM user_news_preferences WHERE user_id = $1`,
      [userId],
    );
    return rows[0] ? rowToPrefs(rows[0]) : null;
  });
  if (fromDb) {
    memory.set(userId, fromDb);
    return fromDb;
  }
  return memory.get(userId) ?? { ...DEFAULT_NEWS_PREFERENCES };
}

export async function setNewsPreferences(
  userId: string,
  input: unknown,
): Promise<NewsPreferences> {
  const prefs = sanitizePreferences(input);
  memory.set(userId, prefs);

  await trySql(async (sql) => {
    await sql.query(
      `INSERT INTO user_news_preferences (
         user_id, coins, categories, updated_at,
         digest_enabled, digest_hour, timezone, push_enabled, push_token
       ) VALUES ($1, $2::jsonb, $3::jsonb, now(), $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET
         coins = EXCLUDED.coins,
         categories = EXCLUDED.categories,
         updated_at = now(),
         digest_enabled = EXCLUDED.digest_enabled,
         digest_hour = EXCLUDED.digest_hour,
         timezone = EXCLUDED.timezone,
         push_enabled = EXCLUDED.push_enabled,
         push_token = EXCLUDED.push_token`,
      [
        userId,
        JSON.stringify(prefs.coins),
        JSON.stringify(prefs.categories),
        prefs.digestEnabled,
        prefs.digestHour,
        prefs.timezone,
        prefs.pushEnabled,
        prefs.pushToken,
      ],
    );
    return true;
  });

  return prefs;
}

export type StoredNewsPrefs = { userId: string; prefs: NewsPreferences };

/** Lista preferências com digest ligado — para o cron. */
export async function listDigestEnabledPreferences(): Promise<StoredNewsPrefs[]> {
  const fromDb = await trySql(async (sql) => {
    const rows = await sql.query<Record<string, unknown>>(
      `SELECT user_id, coins, categories,
              digest_enabled, digest_hour, timezone, push_enabled, push_token
       FROM user_news_preferences
       WHERE digest_enabled = true`,
    );
    return rows.map((r) => ({
      userId: String(r.user_id),
      prefs: rowToPrefs(r),
    }));
  });
  if (fromDb) return fromDb;
  const out: StoredNewsPrefs[] = [];
  for (const [userId, prefs] of memory) {
    if (prefs.digestEnabled) out.push({ userId, prefs });
  }
  return out;
}

export async function hasDigestForDate(userId: string, runDate: string): Promise<boolean> {
  const fromDb = await trySql(async (sql) => {
    const rows = await sql.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM news_digests WHERE user_id = $1 AND run_date = $2::date`,
      [userId, runDate],
    );
    return (rows[0]?.n ?? 0) > 0;
  });
  if (fromDb != null) return fromDb;
  return false;
}

export async function saveDigest(input: {
  id: string;
  userId: string;
  runDate: string;
  itemIds: string[];
  titles: string[];
  pushed: boolean;
}): Promise<void> {
  await trySql(async (sql) => {
    await sql.query(
      `INSERT INTO news_digests (id, user_id, run_date, item_ids, titles, item_count, pushed, created_at)
       VALUES ($1, $2, $3::date, $4::jsonb, $5::jsonb, $6, $7, now())
       ON CONFLICT (user_id, run_date) DO UPDATE SET
         item_ids = EXCLUDED.item_ids,
         titles = EXCLUDED.titles,
         item_count = EXCLUDED.item_count,
         pushed = EXCLUDED.pushed,
         created_at = now()`,
      [
        input.id,
        input.userId,
        input.runDate,
        JSON.stringify(input.itemIds),
        JSON.stringify(input.titles),
        input.itemIds.length,
        input.pushed,
      ],
    );
    return true;
  });
}
