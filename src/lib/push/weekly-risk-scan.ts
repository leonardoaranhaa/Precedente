/**
 * Resumo semanal de risco — domingo 18h UTC, opt-in via digestEnabled.
 */

import {
  countRiskFromLastSent,
  formatWeeklyRiskBody,
  formatWeeklyRiskTitle,
} from "./weekly-risk-build";
import { sendExpoAlerts } from "./expo-send";
import { listSubscriptions, markSent, removeSubscription } from "./store";
import type { AlertEvent } from "./types";

const KEY = "_weekly_risk";
const COOLDOWN_MS = 6 * 24 * 60 * 60 * 1000;
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type WeeklyRiskReport = {
  subscriptions: number;
  due: number;
  sentOk: number;
  sentFailed: number;
  pruned: number;
  errors: string[];
};

export function isWeeklyRiskWindow(nowMs = Date.now()): boolean {
  const d = new Date(nowMs);
  return d.getUTCDay() === 0 && d.getUTCHours() === 18;
}

export async function scanWeeklyRisk(nowMs = Date.now()): Promise<WeeklyRiskReport> {
  const report: WeeklyRiskReport = {
    subscriptions: 0,
    due: 0,
    sentOk: 0,
    sentFailed: 0,
    pruned: 0,
    errors: [],
  };

  if (!isWeeklyRiskWindow(nowMs)) return report;

  const all = await listSubscriptions();
  const subs = all.filter((s) => s.token && s.digestEnabled);
  report.subscriptions = subs.length;

  const due = subs.filter((s) => {
    const last = s.lastSent[KEY] ?? 0;
    return nowMs - last >= COOLDOWN_MS;
  });
  report.due = due.length;

  const windowStart = nowMs - WINDOW_MS;

  for (const sub of due) {
    try {
      const counts = countRiskFromLastSent(sub.lastSent, windowStart, nowMs);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const event: AlertEvent = {
        kind: "sample_weak",
        ticker: "WEEKLY",
        timeframe: "1d",
        displayTicker: "Semanal",
        title: formatWeeklyRiskTitle(total),
        body: formatWeeklyRiskBody(counts, sub.watches.length),
      };
      const send = await sendExpoAlerts(sub.token, [event]);
      report.sentOk += send.ok;
      report.sentFailed += send.failed;
      if (send.invalidToken) {
        await removeSubscription(sub.token);
        report.pruned += 1;
        continue;
      }
      await markSent(sub.token, [KEY], nowMs);
    } catch (err) {
      report.errors.push(
        `token…${sub.token.slice(-8)}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return report;
}
