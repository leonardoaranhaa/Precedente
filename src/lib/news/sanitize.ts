import { DEFAULT_NEWS_PREFERENCES, type NewsCategory, type NewsPreferences } from "./types.ts";

const KNOWN_CATEGORIES = new Set<NewsCategory>([
  "regulatory",
  "market",
  "security",
  "institutional",
  "technology",
]);

const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;

function sanitizeStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item === "string" && item.length > 0 && item.length <= 20) out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

function sanitizeDigestHour(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return DEFAULT_NEWS_PREFERENCES.digestHourUtc;
  const hour = Math.trunc(n);
  if (hour < 0 || hour > 23) return DEFAULT_NEWS_PREFERENCES.digestHourUtc;
  return hour;
}

function sanitizeDigestTokens(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of v) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!EXPO_TOKEN_RE.test(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 8) break;
  }
  return out;
}

export function sanitizePreferences(raw: unknown): NewsPreferences {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_NEWS_PREFERENCES };
  const r = raw as Record<string, unknown>;
  const coins = sanitizeStringArray(r.coins, 50).map((c) => c.toUpperCase());
  const categories = sanitizeStringArray(r.categories, KNOWN_CATEGORIES.size).filter((c) =>
    KNOWN_CATEGORIES.has(c as NewsCategory),
  ) as NewsCategory[];
  const digestEnabled = typeof r.digestEnabled === "boolean" ? r.digestEnabled : false;
  const digestHourUtc = sanitizeDigestHour(r.digestHourUtc);
  const digestTokens = sanitizeDigestTokens(r.digestTokens);
  return { coins, categories, digestEnabled, digestHourUtc, digestTokens };
}
