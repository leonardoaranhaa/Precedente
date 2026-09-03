import { fetchNewsFeed } from "./aggregate";
import { filterNewsForPreferences } from "./filter";
import { formatDigestPushBody, localDateKey, shouldRunDigest } from "./digest-schedule";
import {
  hasDigestForDate,
  listDigestEnabledPreferences,
  saveDigest,
} from "./store";
import type { NewsItem } from "./types";

async function sendDigestPush(
  token: string,
  items: NewsItem[],
): Promise<{ ok: number; failed: number }> {
  const { title, body } = formatDigestPushBody(items);
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        to: token,
        title,
        body,
        sound: "default",
        priority: "high",
        channelId: "precedente-news",
        data: { kind: "news_digest", count: String(items.length) },
      },
    ]),
  });
  if (!res.ok) throw new Error(`Expo Push HTTP ${res.status}`);
  const json = (await res.json()) as { data?: { status: string } | { status: string }[] };
  const tickets = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];
  let ok = 0;
  let failed = 0;
  for (const t of tickets) {
    if (t.status === "ok") ok += 1;
    else failed += 1;
  }
  return { ok, failed };
}

export type DigestScanReport = {
  usersConsidered: number;
  digestsCreated: number;
  pushedOk: number;
  pushedFailed: number;
  skipped: number;
  errors: string[];
};

/**
 * Cron: para cada usuário com digest_enabled, se hora local bate (ou force),
 * filtra feed, grava news_digests e opcionalmente envia push.
 */
export async function runNewsDigestScan(opts: { force?: boolean } = {}): Promise<DigestScanReport> {
  const report: DigestScanReport = {
    usersConsidered: 0,
    digestsCreated: 0,
    pushedOk: 0,
    pushedFailed: 0,
    skipped: 0,
    errors: [],
  };

  const users = await listDigestEnabledPreferences();
  report.usersConsidered = users.length;
  if (users.length === 0) return report;

  let feed: NewsItem[] = [];
  try {
    feed = await fetchNewsFeed();
  } catch (err) {
    report.errors.push(err instanceof Error ? err.message : String(err));
    return report;
  }

  const now = new Date();

  for (const { userId, prefs } of users) {
    try {
      const runDate = localDateKey(now, prefs.timezone);
      const already = await hasDigestForDate(userId, runDate);
      if (
        !shouldRunDigest({
          digestEnabled: prefs.digestEnabled,
          digestHour: prefs.digestHour,
          timezone: prefs.timezone,
          alreadyRanToday: already,
          force: opts.force,
          now,
        })
      ) {
        report.skipped += 1;
        continue;
      }

      const matched = filterNewsForPreferences(feed, prefs).slice(0, 12);
      let pushed = false;
      if (prefs.pushEnabled && prefs.pushToken) {
        try {
          const sent = await sendDigestPush(prefs.pushToken, matched);
          report.pushedOk += sent.ok;
          report.pushedFailed += sent.failed;
          pushed = sent.ok > 0;
        } catch (err) {
          report.pushedFailed += 1;
          report.errors.push(
            `push ${userId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      await saveDigest({
        id: crypto.randomUUID(),
        userId,
        runDate,
        itemIds: matched.map((i) => i.id),
        titles: matched.map((i) => i.title.slice(0, 200)),
        pushed,
      });
      report.digestsCreated += 1;
    } catch (err) {
      report.errors.push(
        `user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return report;
}
