import { fetchNewsFeed } from "./aggregate";
import { filterNewsForPreferences } from "./filter";
import { isDigestDue, withinHardCooldown } from "./digest-schedule";
import { listDigestSubscribers, markDigestSent } from "./store";
import type { NewsItem, NewsPreferences } from "./types";
import { sendExpoAlerts } from "@/lib/push/expo-send";
import type { AlertEvent } from "@/lib/push/types";
import { mapWithConcurrency } from "@/lib/concurrency";

export type DigestScanReport = {
  subscribers: number;
  due: number;
  sentOk: number;
  sentFailed: number;
  skippedNoToken: number;
  skippedEmpty: number;
  errors: string[];
};

const MAX_DIGEST_ITEMS = 6;
const MAX_BODY_CHARS = 180;

function formatDigestBody(items: NewsItem[]): string {
  const lines = items.slice(0, MAX_DIGEST_ITEMS).map((it, i) => `${i + 1}. ${it.title}`);
  let body = lines.join("\n");
  if (body.length > MAX_BODY_CHARS) {
    body = body.slice(0, MAX_BODY_CHARS - 1).trimEnd() + "…";
  }
  return body || "Sem manchetes novas nas suas preferências.";
}

function buildDigestEvent(items: NewsItem[], prefs: NewsPreferences): AlertEvent {
  const coinHint =
    prefs.coins.length > 0 ? prefs.coins.slice(0, 3).join("/") : "mercado";
  const title =
    items.length > 0
      ? `Digest · ${items.length} manchete${items.length === 1 ? "" : "s"} (${coinHint})`
      : `Digest · sem novidades (${coinHint})`;
  return {
    kind: "sample_weak", // reusa canal de alertas; data.kind no cliente pode ignorar
    ticker: "NEWS",
    timeframe: "1d",
    displayTicker: "Notícias",
    title,
    body: formatDigestBody(items),
  };
}

/**
 * Varre preferências com digest ligado, filtra feed e dispara push.
 * Só contexto factual — título/manchete, sem interpretação de trade.
 */
export async function scanNewsDigests(nowMs = Date.now()): Promise<DigestScanReport> {
  const report: DigestScanReport = {
    subscribers: 0,
    due: 0,
    sentOk: 0,
    sentFailed: 0,
    skippedNoToken: 0,
    skippedEmpty: 0,
    errors: [],
  };

  let subs;
  try {
    subs = await listDigestSubscribers();
  } catch (err) {
    report.errors.push(err instanceof Error ? err.message : String(err));
    return report;
  }
  report.subscribers = subs.length;

  const due = subs.filter((s) => {
    if (withinHardCooldown(s.lastDigestAt, nowMs)) return false;
    return isDigestDue({
      digestEnabled: s.prefs.digestEnabled,
      digestHourUtc: s.prefs.digestHourUtc,
      lastDigestAt: s.lastDigestAt,
      nowMs,
    });
  });
  report.due = due.length;
  if (due.length === 0) return report;

  let feed: NewsItem[] = [];
  try {
    feed = await fetchNewsFeed();
  } catch (err) {
    report.errors.push(err instanceof Error ? err.message : String(err));
    return report;
  }

  await mapWithConcurrency(due, 4, async (sub) => {
    try {
      const filtered = filterNewsForPreferences(feed, sub.prefs).slice(0, MAX_DIGEST_ITEMS);
      if (filtered.length === 0) {
        report.skippedEmpty += 1;
        // Ainda marca como enviado pra não martelar o usuário todo ciclo.
        await markDigestSent(sub.userId, nowMs);
        return;
      }

      const tokens = sub.prefs.digestTokens;
      if (tokens.length === 0) {
        report.skippedNoToken += 1;
        await markDigestSent(sub.userId, nowMs);
        return;
      }

      const event = buildDigestEvent(filtered, sub.prefs);
      let anyOk = false;
      for (const token of tokens) {
        const result = await sendExpoAlerts(token, [event]);
        report.sentOk += result.ok;
        report.sentFailed += result.failed;
        if (result.ok > 0) anyOk = true;
      }
      // Marca enviado mesmo com falha parcial — evita spam se token morreu.
      await markDigestSent(sub.userId, nowMs);
      if (!anyOk && tokens.length > 0) {
        report.errors.push(`${sub.userId}: push falhou para todos os tokens`);
      }
    } catch (err) {
      report.errors.push(
        `${sub.userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });

  return report;
}
