/**
 * Scan do resumo diário combinado — watch + notícias num único push.
 *
 * Mesmo esqueleto de digest-scan.ts (watch isolado), com o acréscimo de
 * correlacionar o userId da subscription de push com as preferências de
 * notícia (news/store.ts). As duas telas guardam estado em stores
 * diferentes (push_subscriptions por token, user_news_preferences por
 * userId) — a correlação é só de leitura, não muda nenhum dos dois stores.
 *
 * Compartilha last_digest_at/markDigestSent com o digest de watch isolado
 * de propósito: é o mesmo slot conceitual ("o digest diário do dia"), só
 * com conteúdo diferente. Ver listDigestSubscriptions/
 * listDailySummarySubscriptions em digest-helpers.ts pra a exclusão mútua.
 */
import { runAnalysis } from "@/lib/analyze";
import { fetchMovers24h } from "@/lib/market/movers-24h";
import { mapWithConcurrency } from "@/lib/concurrency";
import { isDigestDue, withinHardCooldown } from "@/lib/news/digest-schedule";
import { fetchNewsFeed } from "@/lib/news/aggregate";
import { filterNewsForPreferences } from "@/lib/news/filter";
import { getNewsPreferences } from "@/lib/news/store";
import { buildDailySummaryBody, buildDailySummaryTitle } from "./daily-summary-build";
import { sendExpoAlerts } from "./expo-send";
import { buildWatchDigestLine } from "./watch-digest-build";
import { listDailySummarySubscriptions, markDigestSent } from "./digest-helpers";
import { removeSubscription } from "./store";
import { pairKey } from "./scan-logic";
import type { AlertEvent, PushSubscription } from "./types";

export type DailySummaryScanReport = {
  subscriptions: number;
  due: number;
  analyzed: number;
  sentOk: number;
  sentFailed: number;
  skippedEmpty: number;
  errors: string[];
};

const ANALYZE_CONCURRENCY = 4;

export async function scanDailySummaries(nowMs = Date.now()): Promise<DailySummaryScanReport> {
  const report: DailySummaryScanReport = {
    subscriptions: 0,
    due: 0,
    analyzed: 0,
    sentOk: 0,
    sentFailed: 0,
    skippedEmpty: 0,
    errors: [],
  };

  let subs: PushSubscription[];
  try {
    subs = await listDailySummarySubscriptions();
  } catch (err) {
    report.errors.push(err instanceof Error ? err.message : String(err));
    return report;
  }
  report.subscriptions = subs.length;

  const due = subs.filter((s) => {
    if (withinHardCooldown(s.lastDigestAt, nowMs)) return false;
    return isDigestDue({
      digestEnabled: true,
      digestHourUtc: s.digestHourUtc,
      lastDigestAt: s.lastDigestAt,
      nowMs,
    });
  });
  report.due = due.length;
  if (due.length === 0) return report;

  const pairMap = new Map<string, { ticker: string; timeframe: PushSubscription["watches"][0]["timeframe"] }>();
  for (const s of due) {
    for (const w of s.watches) {
      pairMap.set(pairKey(w.ticker, w.timeframe), { ticker: w.ticker, timeframe: w.timeframe });
    }
  }
  const pairs = [...pairMap.values()];
  report.analyzed = pairs.length;

  const analysisByPair = new Map<string, Awaited<ReturnType<typeof runAnalysis>>>();
  const pairResults = await mapWithConcurrency(pairs, ANALYZE_CONCURRENCY, async (pair) => {
    try {
      const payload = await runAnalysis({ ticker: pair.ticker, timeframe: pair.timeframe, imageDataUrl: null });
      return [pairKey(pair.ticker, pair.timeframe), payload] as const;
    } catch (err) {
      report.errors.push(`${pair.ticker}:${pair.timeframe} — ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  });
  for (const r of pairResults) {
    if (r) analysisByPair.set(r[0], r[1]);
  }

  let movers: Awaited<ReturnType<typeof fetchMovers24h>> | null = null;
  if (due.some((s) => s.includeMovers)) {
    try {
      movers = await fetchMovers24h({ top: 5 });
    } catch (err) {
      report.errors.push(`movers: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  let newsFeed: Awaited<ReturnType<typeof fetchNewsFeed>> = [];
  try {
    newsFeed = await fetchNewsFeed();
  } catch (err) {
    report.errors.push(`news: ${err instanceof Error ? err.message : String(err)}`);
  }

  for (const sub of due) {
    try {
      const lines = [];
      for (const w of sub.watches) {
        const payload = analysisByPair.get(pairKey(w.ticker, w.timeframe));
        if (!payload) continue;
        lines.push(buildWatchDigestLine(payload, w, sub.rules.drawdownThresholdPct));
      }

      // userId é garantido não-nulo por listDailySummarySubscriptions.
      const newsPrefs = await getNewsPreferences(sub.userId as string);
      const news = filterNewsForPreferences(newsFeed, newsPrefs);

      const useMovers = sub.includeMovers ? movers : null;
      if (lines.length === 0 && news.length === 0 && !useMovers) {
        report.skippedEmpty += 1;
        await markDigestSent(sub.token, nowMs);
        continue;
      }

      const event: AlertEvent = {
        kind: "sample_weak",
        ticker: "SUMMARY",
        timeframe: null,
        displayTicker: "Resumo",
        title: buildDailySummaryTitle(lines, news),
        body: buildDailySummaryBody(lines, news, useMovers),
      };

      const result = await sendExpoAlerts(sub.token, [event]);
      report.sentOk += result.ok;
      report.sentFailed += result.failed;
      if (result.invalidToken) {
        await removeSubscription(sub.token);
        continue;
      }
      await markDigestSent(sub.token, nowMs);
    } catch (err) {
      report.errors.push(`token…${sub.token.slice(-8)}: ${err instanceof Error ? err.message : String(err)}`);
      report.sentFailed += 1;
    }
  }

  return report;
}
