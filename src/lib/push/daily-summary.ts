import { runAnalysis } from "@/lib/analyze";
import type { AnalysisPayload, Timeframe } from "@/lib/market/types";
import { mapWithConcurrency } from "@/lib/concurrency";
import { pairKey, uniqueWatchPairs } from "./scan-logic";
import { listSubscriptions, markSent } from "./store";
import { sendExpoAlerts } from "./expo-send";
import { shouldScan } from "./evaluate";
import type { AlertEvent, PushSubscription } from "./types";

export type DailySummaryReport = {
  subscriptions: number;
  analyzed: number;
  sent: number;
  errors: string[];
};

const SUMMARY_CONCURRENCY = 4;
const DAILY_COOLDOWN_MS = 20 * 60 * 60 * 1000; // 20h

function shouldSendSummary(sub: PushSubscription, now: number): boolean {
  const last = sub.lastSent["daily_summary"] ?? 0;
  return now - last >= DAILY_COOLDOWN_MS;
}

type PairResult = { ok: true; payload: AnalysisPayload } | { ok: false; error: string };

function buildSummaryBody(
  results: Map<string, PairResult>,
  watches: { ticker: string; timeframe: Timeframe }[],
): { title: string; body: string } | null {
  const lines: string[] = [];

  for (const w of watches) {
    const r = results.get(pairKey(w.ticker, w.timeframe));
    if (!r?.ok) continue;
    const p = r.payload;
    const h10 = p.precedent.horizons.find((h) => h.bars === 10) ?? p.precedent.horizons[0];
    if (!h10) continue;

    const arrow = p.snapshot.changePct >= 0 ? "+" : "";
    const change = `${arrow}${p.snapshot.changePct.toFixed(1)}%`;
    const dd = `DD ${Math.abs(h10.medianDrawdownPct).toFixed(1)}%`;
    const sample = p.precedent.sampleNote !== "ok" ? ` [${p.precedent.sampleNote}]` : "";
    const side = p.snapshot.near20High ? " ⚡max20" : p.snapshot.near20Low ? " ⚡min20" : "";
    lines.push(`${p.displayTicker} ${w.timeframe}: ${change} · ${dd}${sample}${side}`);
  }

  if (lines.length === 0) return null;

  return {
    title: `Resumo diário — ${lines.length} par${lines.length > 1 ? "es" : ""}`,
    body: lines.join("\n"),
  };
}

export async function scanDailySummary(): Promise<DailySummaryReport> {
  const report: DailySummaryReport = {
    subscriptions: 0,
    analyzed: 0,
    sent: 0,
    errors: [],
  };

  const now = Date.now();
  const subs = (await listSubscriptions())
    .filter(shouldScan)
    .filter((s) => shouldSendSummary(s, now));
  report.subscriptions = subs.length;

  if (subs.length === 0) return report;

  const pairs = uniqueWatchPairs(
    subs.map((s) => ({ watches: s.watches as { ticker: string; timeframe: Timeframe }[] })),
  );
  report.analyzed = pairs.length;

  const pairResults = await mapWithConcurrency(pairs, SUMMARY_CONCURRENCY, async (pair) => {
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
    const summary = buildSummaryBody(resultByPair, sub.watches);
    if (!summary) continue;

    const event: AlertEvent = {
      kind: "sample_weak",
      ticker: "SUMMARY",
      timeframe: "1h",
      displayTicker: "Resumo",
      title: summary.title,
      body: summary.body,
    };

    try {
      const result = await sendExpoAlerts(sub.token, [event]);
      if (result.ok > 0) {
        report.sent++;
        await markSent(sub.token, ["daily_summary"]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "falha push";
      report.errors.push(`token…${sub.token.slice(-8)} — ${msg}`);
    }
  }

  return report;
}
