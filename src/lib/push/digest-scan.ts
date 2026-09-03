/**
 * Digest diário: estado da watch + (opcional) maiores movers 24h.
 * Schedule puro reutilizado de news/digest-schedule.
 */

import { runAnalysis } from "@/lib/analyze";
import { fetchMovers24h } from "@/lib/market/movers-24h";
import { mapWithConcurrency } from "@/lib/concurrency";
import { isDigestDue, withinHardCooldown } from "@/lib/news/digest-schedule";
import { sendExpoAlerts } from "./expo-send";
import {
  buildWatchDigestLine,
  formatWatchDigestBody,
  formatWatchDigestTitle,
} from "./watch-digest-build";
import {
  listDigestSubscriptions,
  markDigestSent,
} from "./digest-helpers";
import type { AlertEvent, PushSubscription } from "./types";
import { pairKey } from "./scan-logic";

export type DigestScanReport = {
  subscriptions: number;
  due: number;
  analyzed: number;
  sentOk: number;
  sentFailed: number;
  skippedEmpty: number;
  errors: string[];
};

const ANALYZE_CONCURRENCY = 4;

export async function scanWatchDigests(nowMs = Date.now()): Promise<DigestScanReport> {
  const report: DigestScanReport = {
    subscriptions: 0,
    due: 0,
    analyzed: 0,
    sentOk: 0,
    sentFailed: 0,
    skippedEmpty: 0,
    errors: [],
  };

  let subs: Awaited<ReturnType<typeof listDigestSubscriptions>>;
  try {
    subs = await listDigestSubscriptions();
  } catch (err) {
    report.errors.push(err instanceof Error ? err.message : String(err));
    return report;
  }
  report.subscriptions = subs.length;

  const due = subs.filter((s) => {
    if (withinHardCooldown(s.lastDigestAt, nowMs)) return false;
    return isDigestDue({
      digestEnabled: s.digestEnabled,
      digestHourUtc: s.digestHourUtc,
      lastDigestAt: s.lastDigestAt,
      nowMs,
    });
  });
  report.due = due.length;
  if (due.length === 0) return report;

  const pairMap = new Map<
    string,
    { ticker: string; timeframe: PushSubscription["watches"][0]["timeframe"] }
  >();
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
      const payload = await runAnalysis({
        ticker: pair.ticker,
        timeframe: pair.timeframe,
        imageDataUrl: null,
      });
      return [pairKey(pair.ticker, pair.timeframe), payload] as const;
    } catch (err) {
      report.errors.push(
        `${pair.ticker}:${pair.timeframe} — ${err instanceof Error ? err.message : String(err)}`,
      );
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

  for (const sub of due) {
    try {
      if (sub.watches.length === 0 && !(sub.includeMovers && movers)) {
        report.skippedEmpty += 1;
        await markDigestSent(sub.token, nowMs);
        continue;
      }

      const lines = [];
      for (const w of sub.watches) {
        const payload = analysisByPair.get(pairKey(w.ticker, w.timeframe));
        if (!payload) continue;
        lines.push(buildWatchDigestLine(payload, w, sub.rules.drawdownThresholdPct));
      }

      const useMovers = sub.includeMovers ? movers : null;
      if (lines.length === 0 && !useMovers) {
        report.skippedEmpty += 1;
        await markDigestSent(sub.token, nowMs);
        continue;
      }

      const event: AlertEvent = {
        kind: "sample_weak",
        ticker: "DIGEST",
        timeframe: "1d",
        displayTicker: "Digest",
        title: formatWatchDigestTitle(lines, useMovers != null),
        body: formatWatchDigestBody(lines, useMovers),
      };

      const result = await sendExpoAlerts(sub.token, [event]);
      report.sentOk += result.ok;
      report.sentFailed += result.failed;
      await markDigestSent(sub.token, nowMs);
    } catch (err) {
      report.errors.push(
        `token…${sub.token.slice(-8)}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return report;
}
