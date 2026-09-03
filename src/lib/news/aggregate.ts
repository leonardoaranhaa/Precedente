import { mapWithConcurrency } from "../concurrency.ts";
import { detectCategories, detectCoins } from "./classify.ts";
import { parseRssFeed } from "./rss.ts";
import { NEWS_SOURCES, type NewsSource } from "./sources.ts";
import type { NewsItem } from "./types.ts";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_ITEMS_PER_SOURCE = 30;

// Cache curto em memória — GET /api/news/feed é público, sem cache cada
// request (de vários IPs, ou um cliente no limite da janela de rate limit)
// fanava pra 4 chamadas de rede às fontes reais pro mesmo resultado, a
// poucos segundos de distância. 2 min é bem menor que o intervalo real de
// publicação dessas fontes — não perde frescor que importa.
const CACHE_TTL_MS = 2 * 60 * 1000;
let cache: { items: NewsItem[]; at: number } | null = null;

/** Só pra dedupe — remove querystring/tracking, não é a URL final exibida. */
function dedupeKey(link: string): string {
  try {
    const u = new URL(link);
    return `${u.origin}${u.pathname}`;
  } catch {
    return link;
  }
}

async function fetchFeed(source: NewsSource): Promise<NewsItem[]> {
  try {
    const res = await fetch(source.url, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssFeed(xml)
      .slice(0, MAX_ITEMS_PER_SOURCE)
      .map((raw) => {
        const text = `${raw.title} ${raw.description}`;
        return {
          id: dedupeKey(raw.link),
          title: raw.title,
          link: raw.link,
          source: source.name,
          publishedAt: raw.publishedAt,
          coins: detectCoins(text),
          categories: detectCategories(text),
        };
      });
  } catch {
    // Um feed fora do ar/lento não derruba os outros.
    return [];
  }
}

/**
 * Busca todas as fontes configuradas, dedupe entre elas, ordenado por mais
 * recente. O cache curto só se aplica à chamada com as fontes padrão (o
 * caso comum, `GET /api/news/feed` sem override) — uma lista de fontes
 * explícita (testes, uso futuro) sempre busca ao vivo.
 */
export async function fetchNewsFeed(sources: NewsSource[] = NEWS_SOURCES): Promise<NewsItem[]> {
  const usesDefaultSources = sources === NEWS_SOURCES;
  if (usesDefaultSources && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.items;
  }

  const bySource = await mapWithConcurrency(sources, 4, fetchFeed);
  const seen = new Set<string>();
  const items: NewsItem[] = [];
  for (const list of bySource) {
    for (const item of list) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }
  items.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));

  if (usesDefaultSources) cache = { items, at: Date.now() };
  return items;
}
