import type { WatchItem } from "../watchlist";

export const WATCH_TABS = ["mine", "focus", "fragile"] as const;
export type WatchTab = (typeof WATCH_TABS)[number];

export const WATCH_QUICK_FILTERS = [
  "all",
  "extreme20",
  "fragileSample",
  "dd3",
  "rsiLow",
  "rsiHigh",
] as const;
export type WatchQuickFilter = (typeof WATCH_QUICK_FILTERS)[number];

export type WatchSortKey = "delta" | "sample" | "dd";
export type WatchSortDir = "asc" | "desc";

const SAMPLE_RANK: Record<WatchItem["sampleNote"], number> = { tiny: 0, small: 1, ok: 2 };

/** Mesma noção de fragilidade do checklist do Risk Rail — amostra fraca, extremo de 20 barras ou drawdown relevante no caminho. */
export function isFragile(item: WatchItem): boolean {
  return (
    item.sampleNote !== "ok" ||
    item.near20High ||
    item.near20Low ||
    Math.abs(item.medianDrawdownPct) > 3
  );
}

export function filterByTab(items: WatchItem[], tab: WatchTab, focusIds: string[]): WatchItem[] {
  if (tab === "fragile") return items.filter(isFragile);
  if (tab === "focus") {
    const order = new Map(focusIds.map((id, i) => [id, i]));
    return items
      .filter((i) => order.has(i.id))
      .sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  }
  return items;
}

export function applyQuickFilter(items: WatchItem[], filter: WatchQuickFilter): WatchItem[] {
  switch (filter) {
    case "extreme20":
      return items.filter((i) => i.near20High || i.near20Low);
    case "fragileSample":
      return items.filter((i) => i.sampleNote !== "ok");
    case "dd3":
      return items.filter((i) => Math.abs(i.medianDrawdownPct) > 3);
    case "rsiLow":
      return items.filter((i) => i.rsi14 < 30);
    case "rsiHigh":
      return items.filter((i) => i.rsi14 > 70);
    default:
      return items;
  }
}

export function quickFilterLabel(filter: WatchQuickFilter): string {
  switch (filter) {
    case "extreme20":
      return "Extremo 20";
    case "fragileSample":
      return "Amostra frágil";
    case "dd3":
      return "DD > 3%";
    case "rsiLow":
      return "RSI < 30";
    case "rsiHigh":
      return "RSI > 70";
    default:
      return "Todos";
  }
}

export function sortWatch(items: WatchItem[], key: WatchSortKey, dir: WatchSortDir): WatchItem[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    if (key === "delta") return (a.changePct - b.changePct) * sign;
    if (key === "sample") return (SAMPLE_RANK[a.sampleNote] - SAMPLE_RANK[b.sampleNote]) * sign;
    return (Math.abs(a.medianDrawdownPct) - Math.abs(b.medianDrawdownPct)) * sign;
  });
}
