import type { StoredAnalysis, Timeframe } from "./market/types";

const KEY = "precedente.watch.v1";
const MAX = 24;

export type WatchItem = {
  id: string;
  ticker: string;
  displayTicker: string;
  timeframe: Timeframe;
  /** Última análise conhecida (snapshot leve para a tabela). */
  lastAnalysisId: string;
  updatedAt: number;
  price: number;
  changePct: number;
  rsi14: number;
  sampleNote: "ok" | "small" | "tiny";
  matches: number;
  /** Drawdown mediano do horizonte de 10 barras (ou o do meio). */
  medianDrawdownPct: number;
  near20High: boolean;
  near20Low: boolean;
  fingerprintLabel: string;
};

function pickHorizonDrawdown(a: StoredAnalysis): number {
  const hs = a.precedent.horizons;
  const mid = hs.find((h) => h.bars === 10) ?? hs[Math.min(1, hs.length - 1)] ?? hs[0];
  return mid?.medianDrawdownPct ?? 0;
}

export function analysisToWatchItem(a: StoredAnalysis): WatchItem {
  return {
    id: `${a.ticker}:${a.timeframe}`,
    ticker: a.ticker,
    displayTicker: a.displayTicker,
    timeframe: a.timeframe,
    lastAnalysisId: a.id,
    updatedAt: a.createdAt,
    price: a.snapshot.last.c,
    changePct: a.snapshot.changePct,
    rsi14: a.snapshot.rsi14,
    sampleNote: a.precedent.sampleNote,
    matches: a.precedent.matches,
    medianDrawdownPct: pickHorizonDrawdown(a),
    near20High: a.snapshot.near20High,
    near20Low: a.snapshot.near20Low,
    fingerprintLabel: a.precedent.fingerprintLabel,
  };
}

export function loadWatchlist(): WatchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WatchItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWatchlist(items: WatchItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
  } catch {
    /* quota */
  }
}

export function upsertWatch(
  current: WatchItem[],
  analysis: StoredAnalysis,
): WatchItem[] {
  const next = analysisToWatchItem(analysis);
  const items = [next, ...current.filter((w) => w.id !== next.id)].slice(0, MAX);
  saveWatchlist(items);
  return items;
}

export function removeWatch(current: WatchItem[], id: string): WatchItem[] {
  const items = current.filter((w) => w.id !== id);
  saveWatchlist(items);
  return items;
}

export function isWatched(current: WatchItem[], analysis: StoredAnalysis): boolean {
  const id = `${analysis.ticker}:${analysis.timeframe}`;
  return current.some((w) => w.id === id);
}
