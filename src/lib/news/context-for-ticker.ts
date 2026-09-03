import type { NewsCategory, NewsContext, NewsItem } from "./types.ts";

const ALL_FLAGS: NewsCategory[] = [
  "regulatory",
  "market",
  "security",
  "institutional",
  "technology",
];

/** Extrai base (BTC) de BTCUSDT / BTC. */
export function baseAssetFromTicker(ticker: string): string {
  const s = ticker.trim().toUpperCase().replace(/[\s\-_/]/g, "");
  const quotes = ["USDT", "USDC", "BUSD", "FDUSD", "BRL"];
  for (const q of quotes) {
    if (s.endsWith(q) && s.length > q.length) return s.slice(0, -q.length);
  }
  return s;
}

/**
 * Manchetes recentes ligadas ao ativo — camada de contexto, não estatística.
 * Não altera horizontes/precedente.
 */
export function buildNewsContext(
  items: NewsItem[],
  ticker: string,
  opts: { windowHours?: number; now?: number; limit?: number } = {},
): NewsContext {
  const windowHours = opts.windowHours ?? 48;
  const limit = opts.limit ?? 8;
  const now = opts.now ?? Date.now();
  const cutoff = now - windowHours * 60 * 60 * 1000;
  const base = baseAssetFromTicker(ticker);

  const matched = items
    .filter((item) => {
      if (!item.coins.includes(base)) return false;
      if (item.publishedAt != null && item.publishedAt < cutoff) return false;
      return true;
    })
    .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
    .slice(0, limit);

  const flags = Object.fromEntries(ALL_FLAGS.map((c) => [c, false])) as Record<
    NewsCategory,
    boolean
  >;
  for (const item of matched) {
    for (const c of item.categories) flags[c] = true;
  }

  return {
    windowHours,
    flags,
    items: matched.map((i) => ({
      id: i.id,
      title: i.title,
      link: i.link,
      source: i.source,
      publishedAt: i.publishedAt,
      coins: i.coins,
      categories: i.categories,
    })),
  };
}
