/**
 * Precedente de abertura — domingo 20h UTC ou segunda 06h UTC.
 * Só TFs 4h e 1d. Estado em lastSent["_opening_digest"].
 */

import { runAnalysis } from "@/lib/analyze";
import type { Timeframe } from "@/lib/market/types";
import { mapWithConcurrency } from "@/lib/concurrency";
import { sendExpoAlerts } from "./expo-send";
import {
  buildOpeningLine,
  formatOpeningBody,
  formatOpeningTitle,
} from "./opening-digest-build";
import { listSubscriptions, markSent, removeSubscription } from "./store";
import type { AlertEvent } from "./types";
import { pairKey } from "./scan-logic";

const KEY = "_opening_digest";
const COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000;
const OPENING_TFS = new Set<Timeframe>(["4h", "1d"]);
const CONCURRENCY = 3;

export type OpeningScanReport = {
  subscriptions: number;
  due: number;
  pairs: number;
  sentOk: number;
  sentFailed: number;
  pruned: number;
  errors: string[];
};

export function isOpeningWindow(nowMs = Date.now()): boolean {
  const d = new Date(nowMs);
  const day = d.getUTCDay();
  const hour = d.getUTCHours();
  if (day === 0 && hour === 20) return true;
  if (day === 1 && hour === 6) return true;
  return false;
}

export async function scanOpeningDigests(nowMs = Date.now()): Promise<OpeningScanReport> {
  const report: OpeningScanReport = {
    subscriptions: 0,
    due: 0,
    pairs: 0,
    sentOk: 0,
    sentFailed: 0,
    pruned: 0,
    errors: [],
  };

  if (!isOpeningWindow(nowMs)) return report;

  const all = await listSubscriptions();
  const subs = all.filter((s) => s.token && s.watches.some((w) => OPENING_TFS.has(w.timeframe)));
  report.subscriptions = subs.length;

  const due = subs.filter((s) => {
    const last = s.lastSent[KEY] ?? 0;
    return nowMs - last >= COOLDOWN_MS;
  });
  report.due = due.length;
  if (due.length === 0) return report;

  const pairMap = new Map<string, { ticker: string; timeframe: Timeframe }>();
  for (const s of due) {
    for (const w of s.watches) {
      if (!OPENING_TFS.has(w.timeframe)) continue;
      pairMap.set(pairKey(w.ticker, w.timeframe), {
        ticker: w.ticker,
        timeframe: w.timeframe,
      });
    }
  }
  const pairs = [...pairMap.values()];
  report.pairs = pairs.length;

  const payloadByKey = new Map<string, Awaited<ReturnType<typeof runAnalysis>>>();
  const results = await mapWithConcurrency(pairs, CONCURRENCY, async (p) => {
    try {
      const payload = await runAnalysis({
        ticker: p.ticker,
        timeframe: p.timeframe,
        imageDataUrl: null,
      });
      return [pairKey(p.ticker, p.timeframe), payload] as const;
    } catch (err) {
      report.errors.push(
        `${p.ticker}:${p.timeframe} — ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  });
  for (const r of results) {
    if (r) payloadByKey.set(r[0], r[1]);
  }

  for (const sub of due) {
    try {
      const lines = [];
      for (const w of sub.watches) {
        if (!OPENING_TFS.has(w.timeframe)) continue;
        const payload = payloadByKey.get(pairKey(w.ticker, w.timeframe));
        if (payload) lines.push(buildOpeningLine(payload));
      }
      if (lines.length === 0) {
        await markSent(sub.token, [KEY], nowMs);
        continue;
      }
      const event: AlertEvent = {
        kind: "sample_weak",
        ticker: "OPENING",
        timeframe: "1d",
        displayTicker: "Abertura",
        title: formatOpeningTitle(lines.length),
        body: formatOpeningBody(lines),
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
