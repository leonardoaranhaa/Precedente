import { DEFAULT_NEWS_PREFERENCES, type NewsCategory, type NewsPreferences } from "./types.ts";

const KNOWN_CATEGORIES = new Set<NewsCategory>([
  "regulatory",
  "market",
  "security",
  "institutional",
  "technology",
]);

function sanitizeStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item === "string" && item.length > 0 && item.length <= 20) out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

export function sanitizePreferences(raw: unknown): NewsPreferences {
  if (!raw || typeof raw !== "object") return DEFAULT_NEWS_PREFERENCES;
  const r = raw as Record<string, unknown>;
  const coins = sanitizeStringArray(r.coins, 50).map((c) => c.toUpperCase());
  const categories = sanitizeStringArray(r.categories, KNOWN_CATEGORIES.size).filter((c) =>
    KNOWN_CATEGORIES.has(c as NewsCategory),
  ) as NewsCategory[];
  return { coins, categories };
}
