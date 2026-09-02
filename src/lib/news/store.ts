import { getSql } from "@/lib/db";
import { DEFAULT_NEWS_PREFERENCES, type NewsPreferences } from "./types";
import { sanitizePreferences } from "./sanitize";

export { sanitizePreferences } from "./sanitize";

/**
 * Mesmo padrão de `push/store.ts`: Postgres preferencial, fallback em
 * memória se o DB não estiver disponível.
 */
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

export async function getNewsPreferences(userId: string): Promise<NewsPreferences> {
  const fromDb = await trySql(async (sql) => {
    const rows = await sql.query<{ coins: unknown; categories: unknown }>(
      `SELECT coins, categories FROM user_news_preferences WHERE user_id = $1`,
      [userId],
    );
    return rows[0] ? sanitizePreferences(rows[0]) : null;
  });
  if (fromDb) {
    memory.set(userId, fromDb);
    return fromDb;
  }
  return memory.get(userId) ?? DEFAULT_NEWS_PREFERENCES;
}

export async function setNewsPreferences(
  userId: string,
  input: unknown,
): Promise<NewsPreferences> {
  const prefs = sanitizePreferences(input);
  memory.set(userId, prefs);

  await trySql(async (sql) => {
    await sql.query(
      `INSERT INTO user_news_preferences (user_id, coins, categories, updated_at)
       VALUES ($1, $2::jsonb, $3::jsonb, now())
       ON CONFLICT (user_id) DO UPDATE SET
         coins = EXCLUDED.coins,
         categories = EXCLUDED.categories,
         updated_at = now()`,
      [userId, JSON.stringify(prefs.coins), JSON.stringify(prefs.categories)],
    );
    return true;
  });

  return prefs;
}
