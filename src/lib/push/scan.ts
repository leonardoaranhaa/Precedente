import { runAnalysis } from "@/lib/analyze";
import type { Timeframe } from "@/lib/market/types";
import { alertCooldownKey, evaluateAlerts, shouldScan } from "./evaluate";
import { sendExpoAlerts } from "./expo-send";
import { listSubscriptions, markSent } from "./store";

export type ScanReport = {
  subscriptions: number;
  analyzed: number;
  alerts: number;
  sentOk: number;
  sentFailed: number;
  errors: string[];
};

/**
 * Percorre todas as subscriptions, reanalisa watches (sem vision) e dispara push.
 * Pensado para cron (Railway) ou chamada manual autenticada.
 */
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

  for (const sub of subs) {
    const eventsForToken = [];
    for (const w of sub.watches) {
      try {
        const payload = await runAnalysis({
          ticker: w.ticker,
          timeframe: w.timeframe as Timeframe,
          imageDataUrl: null,
        });
        report.analyzed += 1;
        const events = evaluateAlerts(payload, sub.rules, sub.lastSent);
        eventsForToken.push(...events);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "erro";
        report.errors.push(`${w.ticker}:${w.timeframe} — ${msg}`);
      }
    }

    if (eventsForToken.length === 0) continue;
    report.alerts += eventsForToken.length;

    try {
      const result = await sendExpoAlerts(sub.token, eventsForToken);
      report.sentOk += result.ok;
      report.sentFailed += result.failed;
      if (result.ok > 0) {
        await markSent(
          sub.token,
          eventsForToken.map(alertCooldownKey),
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "falha push";
      report.errors.push(`token…${sub.token.slice(-8)} — ${msg}`);
      report.sentFailed += eventsForToken.length;
    }
  }

  return report;
}
