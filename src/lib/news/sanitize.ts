import { DEFAULT_NEWS_PREFERENCES, type NewsCategory, type NewsPreferences } from "./types.ts";

const KNOWN_CATEGORIES = new Set<NewsCategory>([
  "regulatory",
  "market",
  "security",
  "institutional",
  "technology",
]);

const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;

/** Timezones aceitos — lista curta + fallback seguro. */
const SAFE_TIMEZONES = new Set([
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Bahia",
  "America/Cuiaba",
  "America/Porto_Velho",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "UTC",
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

function sanitizeHour(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return DEFAULT_NEWS_PREFERENCES.digestHour;
  return Math.min(23, Math.max(0, Math.floor(n)));
}

function sanitizeTimezone(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) return DEFAULT_NEWS_PREFERENCES.timezone;
  const tz = v.trim();
  if (SAFE_TIMEZONES.has(tz)) return tz;
  // Aceita outros IANA se o runtime reconhece (sem quebrar o cron).
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return DEFAULT_NEWS_PREFERENCES.timezone;
  }
}

function sanitizePushToken(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const t = v.trim();
  if (t.length > 200) return null;
  if (!EXPO_TOKEN_RE.test(t)) return null;
  return t;
}

export function sanitizePreferences(raw: unknown): NewsPreferences {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_NEWS_PREFERENCES };
  const r = raw as Record<string, unknown>;
  const coins = sanitizeStringArray(r.coins, 50).map((c) => c.toUpperCase());
  const categories = sanitizeStringArray(r.categories, KNOWN_CATEGORIES.size).filter((c) =>
    KNOWN_CATEGORIES.has(c as NewsCategory),
  ) as NewsCategory[];

  return {
    coins,
    categories,
    digestEnabled: r.digestEnabled === false ? false : true,
    digestHour: sanitizeHour(r.digestHour),
    timezone: sanitizeTimezone(r.timezone),
    pushEnabled: r.pushEnabled === false ? false : true,
    pushToken: sanitizePushToken(r.pushToken),
  };
}
