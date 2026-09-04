/**
 * Digest de funding/OI 2×/dia (08h e 20h UTC) para quem tem fundingExtreme ligado.
 * Estado em lastSent["_funding_digest"] = timestamp.
 */

import { mapWithConcurrency } from "@/lib/concurrency";
import { sendExpoAlerts } from "./expo-send";
import {
  formatFundingDigestBody,
  formatFundingDigestTitle,
  type FundingRow,
} from "./funding-digest-build";
import { listSubscriptions, markSent, removeSubscription } from "./store";
import type { AlertEvent } from "./types";
import { pairKey } from "./scan-logic";

const FUNDING_KEY = "_funding_digest";
const COOLDOWN_MS = 10 * 60 * 60 * 1000;
const HOURS_UTC = new Set([8, 20]);
const FETCH_CONCURRENCY = 4;

export type FundingDigestReport = {
  subscriptions: number;
  due: number;
  pairs: number;
  sentOk: number;
  sentFailed: number;
  pruned: number;
  errors: string[];
};

function isFundingDigestDue(lastSent: Record<string, number>, nowMs: number): boolean {
  const hour = new Date(nowMs).getUTCHours();
  if (!HOURS_UTC.has(hour)) return false;
  const last = lastSent[FUNDING_KEY] ?? 0;
  return nowMs - last >= COOLDOWN_MS;
}

export async function scanFundingDigests(nowMs = Date.now()): Promise<FundingDigestReport> {
  const report: FundingDigestReport = {
    subscriptions: 0,
    due: 0,
    pairs: 0,
    sentOk: 0,
    sentFailed: 0,
    pruned: 0,
    errors: [],
  };

  const all = await listSubscriptions();
  const subs = all.filter(
    (s) => s.token && s.watches.length > 0 && s.rules.fundingExtreme !== false,
  );
  report.subscriptions = subs.length;

  const due = subs.filter((s) => isFundingDigestDue(s.lastSent, nowMs));
  report.due = due.length;
  if (due.length === 0) return report;

  const pairMap = new Map<string, { ticker: string; displayTicker: string }>();
  for (const s of due) {
    for (const w of s.watches) {
      const k = pairKey(w.ticker, w.timeframe);
      if (!pairMap.has(k)) {
        pairMap.set(k, {
          ticker: w.ticker,
          displayTicker: w.displayTicker ?? w.ticker,
        });
      }
    }
  }
  const byTicker = new Map<string, { ticker: string; displayTicker: string }>();
  for (const v of pairMap.values()) {
    if (!byTicker.has(v.ticker)) byTicker.set(v.ticker, v);
  }
  const tickers = [...byTicker.values()];
  report.pairs = tickers.length;

  const { fetchOnchainContext } = await import("@/lib/market/onchain");
  const rowByTicker = new Map<string, FundingRow>();
  const results = await mapWithConcurrency(tickers, FETCH_CONCURRENCY, async (t) => {
    try {
      const oc = await fetchOnchainContext(t.ticker);
      return {
        displayTicker: t.displayTicker,
        symbol: t.ticker,
        fundingRate: oc.fundingRate,
        openInterest: oc.openInterest,
        markPrice: oc.markPrice,
        source: oc.derivativesSource ?? null,
      } satisfies FundingRow;
    } catch (err) {
      report.errors.push(
        `${t.ticker}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  });
  for (const r of results) {
    if (r) rowByTicker.set(r.symbol, r);
  }

  for (const sub of due) {
    try {
      const rows: FundingRow[] = [];
      const seen = new Set<string>();
      for (const w of sub.watches) {
        if (seen.has(w.ticker)) continue;
        seen.add(w.ticker);
        const row = rowByTicker.get(w.ticker);
        if (row) rows.push(row);
      }

      const event: AlertEvent = {
        kind: "funding_extreme",
        ticker: "FUNDING",
        timeframe: "1d",
        displayTicker: "Funding",
        title: formatFundingDigestTitle(rows),
        body: formatFundingDigestBody(rows),
      };

      const send = await sendExpoAlerts(sub.token, [event]);
      report.sentOk += send.ok;
      report.sentFailed += send.failed;

      if (send.invalidToken) {
        await removeSubscription(sub.token);
        report.pruned += 1;
        continue;
      }

      await markSent(sub.token, [FUNDING_KEY], nowMs);
    } catch (err) {
      report.errors.push(
        `token…${sub.token.slice(-8)}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return report;
}
