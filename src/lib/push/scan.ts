import { runAnalysis } from "@/lib/analyze";
import type { AnalysisPayload, Timeframe } from "@/lib/market/types";
import { mapWithConcurrency } from "@/lib/concurrency";
import { alertCooldownKey, evaluateAlerts, regimeStatePatch, shouldScan } from "./evaluate";
import { sendExpoAlerts } from "./expo-send";
import { pairKey, uniqueWatchPairs } from "./scan-logic";
import { listSubscriptions, markSent, markRegimeState } from "./store";

export type ScanReport = {
  subscriptions: number;
  analyzed: number;
  alerts: number;
  sentOk: number;
  sentFailed: number;
  errors: string[];
};

const SCAN_CONCURRENCY = 4;

type PairResult = { ok: true; payload: AnalysisPayload } | { ok: false; error: string };

export async function scanAllSubscriptions(): Promise<ScanReport> {
  const report: ScanReport = {
    subscriptions: 0,
    analyzed: 0,
    alerts: 0,
    sentOk: 0,
    sentFailed: 0,
    errors: [],
  };

  const subs = (await listSubscriptions()).filter(shouldScan);
  report.subscriptions = subs.length;

  const pairs = uniqueWatchPairs(
    subs.map((s) => ({ watches: s.watches as { ticker: string; timeframe: Timeframe }[] })),
  );
  report.analyzed = pairs.length;

  const pairResults = await mapWithConcurrency(pairs, SCAN_CONCURRENCY, async (pair) => {
    try {
      const payload = await runAnalysis({
        ticker: pair.ticker,
        timeframe: pair.timeframe,
        imageDataUrl: null,
      });
      return [pairKey(pair.ticker, pair.timeframe), { ok: true, payload }] as const;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro";
      return [pairKey(pair.ticker, pair.timeframe), { ok: false, error: msg }] as const;
    }
  });

  const resultByPair = new Map<string, PairResult>(pairResults);
  for (const [key, result] of resultByPair) {
    if (!result.ok) report.errors.push(`${key} — ${result.error}`);
  }

  for (const sub of subs) {
    const eventsForToken = [];
    const regimePatches: { key: string; code: number }[] = [];

    for (const w of sub.watches) {
      const result = resultByPair.get(pairKey(w.ticker, w.timeframe));
      if (!result?.ok) continue;
      const events = evaluateAlerts(result.payload, w, sub.rules, sub.lastSent);
      eventsForToken.push(...events);
      const patch = regimeStatePatch(
        result.payload.ticker,
        result.payload.timeframe,
        result.payload.precedent.sampleNote,
      );
      regimePatches.push(patch);
    }

    if (regimePatches.length > 0) {
      await markRegimeState(sub.token, regimePatches);
    }

    if (eventsForToken.length === 0) continue;
    report.alerts += eventsForToken.length;

    try {
      const result = await sendExpoAlerts(sub.token, eventsForToken);
      report.sentOk += result.ok;
      report.sentFailed += result.failed;
      if (result.ok > 0) {
        await markSent(sub.token, eventsForToken.map(alertCooldownKey));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "falha push";
      report.errors.push(`token…${sub.token.slice(-8)} — ${msg}`);
      report.sentFailed += eventsForToken.length;
    }
  }

  return report;
}
