import { fetchOnchainContext } from "@/lib/market/onchain";
import { mapWithConcurrency } from "@/lib/concurrency";
import { uniqueWatchPairs } from "./scan-logic";
import { listSubscriptions, markSent } from "./store";
import { sendExpoAlerts } from "./expo-send";
import { shouldScan } from "./evaluate";
import type { AlertEvent, PushSubscription } from "./types";
import type { Timeframe, OnchainContext } from "@/lib/market/types";

export type DexDrainReport = {
  subscriptions: number;
  pairsChecked: number;
  drainAlerts: number;
  sent: number;
  errors: string[];
};

const DRAIN_CONCURRENCY = 6;
const DRAIN_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h per pair

const LIQ_CRITICAL_USD = 10_000;
const SELL_RATIO_THRESHOLD = 0.75;

export type DrainSignal = {
  ticker: string;
  displayTicker: string;
  reason: string;
  liquidityUsd: number | null;
  sellRatio6h: number | null;
  priceChange1hPct: number | null;
};

export function detectDrain(
  ticker: string,
  displayTicker: string,
  ctx: OnchainContext,
): DrainSignal | null {
  const reasons: string[] = [];

  if (ctx.liquidityUsd != null && ctx.liquidityUsd < LIQ_CRITICAL_USD) {
    reasons.push(`liquidez crítica ($${Math.round(ctx.liquidityUsd)})`);
  }

  const buys6h = ctx.buys6h ?? 0;
  const sells6h = ctx.sells6h ?? 0;
  const total6h = buys6h + sells6h;
  const sellRatio = total6h > 10 ? sells6h / total6h : null;

  if (sellRatio != null && sellRatio >= SELL_RATIO_THRESHOLD) {
    reasons.push(`${(sellRatio * 100).toFixed(0)}% vendas em 6h`);
  }

  const pc1h = ctx.priceChange1hPct ?? null;
  if (pc1h != null && pc1h <= -10) {
    reasons.push(`preço −${Math.abs(pc1h).toFixed(0)}% em 1h`);
  }

  if (reasons.length === 0) return null;

  return {
    ticker,
    displayTicker,
    reason: reasons.join(" · "),
    liquidityUsd: ctx.liquidityUsd,
    sellRatio6h: sellRatio,
    priceChange1hPct: pc1h,
  };
}

function drainCooldownKey(ticker: string): string {
  return `${ticker}:dex_drain`;
}

function shouldAlertDrain(sub: PushSubscription, ticker: string, now: number): boolean {
  const last = sub.lastSent[drainCooldownKey(ticker)] ?? 0;
  return now - last >= DRAIN_COOLDOWN_MS;
}

function baseAsset(symbol: string): string {
  const s = symbol.toUpperCase();
  for (const q of ["USDT", "USDC", "BUSD", "FDUSD", "BRL"]) {
    if (s.endsWith(q) && s.length > q.length) return s.slice(0, -q.length);
  }
  return s;
}

export async function scanDexDrain(): Promise<DexDrainReport> {
  const report: DexDrainReport = {
    subscriptions: 0,
    pairsChecked: 0,
    drainAlerts: 0,
    sent: 0,
    errors: [],
  };

  const now = Date.now();
  const subs = (await listSubscriptions()).filter(shouldScan);
  report.subscriptions = subs.length;

  if (subs.length === 0) return report;

  const pairs = uniqueWatchPairs(
    subs.map((s) => ({ watches: s.watches as { ticker: string; timeframe: Timeframe }[] })),
  );

  const uniqueTickers = [...new Set(pairs.map((p) => p.ticker))];
  report.pairsChecked = uniqueTickers.length;

  type TickerResult = { ok: true; ctx: OnchainContext } | { ok: false; error: string };
  const tickerResults = await mapWithConcurrency(uniqueTickers, DRAIN_CONCURRENCY, async (ticker) => {
    try {
      const ctx = await fetchOnchainContext(ticker);
      return [ticker, { ok: true, ctx }] as const;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro";
      return [ticker, { ok: false, error: msg }] as const;
    }
  });

  const resultByTicker = new Map<string, TickerResult>(tickerResults);
  for (const [ticker, result] of resultByTicker) {
    if (!result.ok) report.errors.push(`${ticker} — ${result.error}`);
  }

  const drainByTicker = new Map<string, DrainSignal>();
  for (const [ticker, result] of resultByTicker) {
    if (!result.ok) continue;
    const signal = detectDrain(ticker, baseAsset(ticker), result.ctx);
    if (signal) drainByTicker.set(ticker, signal);
  }

  report.drainAlerts = drainByTicker.size;

  for (const sub of subs) {
    const eventsForToken: AlertEvent[] = [];
    const cooldownKeys: string[] = [];

    for (const w of sub.watches) {
      const signal = drainByTicker.get(w.ticker);
      if (!signal) continue;
      if (!shouldAlertDrain(sub, w.ticker, now)) continue;

      eventsForToken.push({
        kind: "sample_weak",
        ticker: w.ticker,
        timeframe: w.timeframe,
        displayTicker: signal.displayTicker,
        title: `${signal.displayTicker} — sinal de drenagem`,
        body: signal.reason,
      });
      cooldownKeys.push(drainCooldownKey(w.ticker));
    }

    if (eventsForToken.length === 0) continue;

    try {
      const result = await sendExpoAlerts(sub.token, eventsForToken);
      if (result.ok > 0) {
        report.sent += result.ok;
        await markSent(sub.token, cooldownKeys);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "falha push";
      report.errors.push(`token…${sub.token.slice(-8)} — ${msg}`);
    }
  }

  return report;
}
