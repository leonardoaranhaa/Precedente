/**
 * Scan só dos pares com zona de preço/RSI ligada — cadência mais alta no cron.
 * Reusa evaluateAlerts; o cooldown de 6h por kind continua valendo.
 */

import { runAnalysis } from "@/lib/analyze";
import type { AnalysisPayload, Timeframe } from "@/lib/market/types";
import { mapWithConcurrency } from "@/lib/concurrency";
import { alertCooldownKey, evaluateAlerts, shouldScan } from "./evaluate";
import { sendExpoAlerts } from "./expo-send";
import { pairKey } from "./scan-logic";
import { listSubscriptions, markSent, removeSubscription } from "./store";
import type { WatchTarget } from "./types";

export type ZoneScanReport = {
  subscriptions: number;
  zonePairs: number;
  alerts: number;
  sentOk: number;
  sentFailed: number;
  pruned: number;
  errors: string[];
};

const CONCURRENCY = 4;

function hasZone(w: WatchTarget): boolean {
  return Boolean(w.priceZone?.enabled || w.rsiZone?.enabled);
}

type PairResult = { ok: true; payload: AnalysisPayload } | { ok: false; error: string };

export async function scanZoneWatches(): Promise<ZoneScanReport> {
  const report: ZoneScanReport = {
    subscriptions: 0,
    zonePairs: 0,
    alerts: 0,
    sentOk: 0,
    sentFailed: 0,
    pruned: 0,
    errors: [],
  };

  const subs = (await listSubscriptions()).filter(shouldScan);
  report.subscriptions = subs.length;

  const pairMap = new Map<string, { ticker: string; timeframe: Timeframe }>();
  for (const s of subs) {
    for (const w of s.watches) {
      if (!hasZone(w)) continue;
      pairMap.set(pairKey(w.ticker, w.timeframe), {
        ticker: w.ticker,
        timeframe: w.timeframe,
      });
    }
  }
  const pairs = [...pairMap.values()];
  report.zonePairs = pairs.length;
  if (pairs.length === 0) return report;

  const pairResults = await mapWithConcurrency(pairs, CONCURRENCY, async (pair) => {
    try {
      const payload = await runAnalysis({
        ticker: pair.ticker,
        timeframe: pair.timeframe,
        imageDataUrl: null,
      });
      return [pairKey(pair.ticker, pair.timeframe), { ok: true as const, payload }] as const;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro";
      return [pairKey(pair.ticker, pair.timeframe), { ok: false as const, error: msg }] as const;
    }
  });

  const resultByPair = new Map<string, PairResult>(pairResults);
  for (const [key, result] of resultByPair) {
    if (!result.ok) report.errors.push(`${key} — ${result.error}`);
  }

  for (const sub of subs) {
    const eventsForToken = [];
    for (const w of sub.watches) {
      if (!hasZone(w)) continue;
      const result = resultByPair.get(pairKey(w.ticker, w.timeframe));
      if (!result?.ok) continue;
      const zoneOnlyRules = {
        ...sub.rules,
        sampleWeak: false,
        sampleRegime: false,
        drawdownPath: false,
        extreme20: false,
        fundingExtreme: false,
      };
      const events = evaluateAlerts(result.payload, w, zoneOnlyRules, sub.lastSent);
      eventsForToken.push(...events);
    }
    if (eventsForToken.length === 0) continue;
    report.alerts += eventsForToken.length;
    try {
      const result = await sendExpoAlerts(sub.token, eventsForToken);
      report.sentOk += result.ok;
      report.sentFailed += result.failed;
      if (result.invalidToken) {
        await removeSubscription(sub.token);
        report.pruned += 1;
        continue;
      }
      if (result.ok > 0) {
        await markSent(sub.token, eventsForToken.map(alertCooldownKey));
      }
    } catch (err) {
      report.errors.push(
        `token…${sub.token.slice(-8)} — ${err instanceof Error ? err.message : "falha push"}`,
      );
      report.sentFailed += eventsForToken.length;
    }
  }

  return report;
}
