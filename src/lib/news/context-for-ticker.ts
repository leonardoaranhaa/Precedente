import { fetchNewsFeed } from "./aggregate.ts";
import {
  NEWS_CONTEXT_DISCLAIMER,
  type NewsContextItem,
  type NewsContextPayload,
  type NewsItem,
} from "./types.ts";

const MAX_ITEMS = 8;
/** Janela: manchetes dos últimos 3 dias (contexto recente, não arquivo). */
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Extrai a coin base de um ticker Binance-style (BTCUSDT → BTC).
 * Fallbacks conservadores — se não reconhecer, retorna o prefixo até 10 chars.
 */
export function coinFromTicker(ticker: string): string {
  const t = ticker.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!t) return "";
  for (const quote of ["USDT", "USDC", "BUSD", "USD", "BTC", "ETH", "BNB", "FDUSD"]) {
    if (t.endsWith(quote) && t.length > quote.length) {
      return t.slice(0, -quote.length);
    }
  }
  return t.slice(0, 10);
}

function itemMatchesCoin(item: NewsItem, coin: string): boolean {
  if (!coin) return false;
  if (item.coins.includes(coin)) return true;
  // Título às vezes traz o nome sem o classificador ter pegado o ticker.
  const re = new RegExp(`\\b${coin}\\b`, "i");
  return re.test(item.title);
}

function toContextItem(item: NewsItem): NewsContextItem {
  return {
    title: item.title,
    source: item.source,
    link: item.link,
    publishedAt: item.publishedAt,
    coins: item.coins,
    categories: item.categories,
  };
}

/**
 * Monta contexto de notícias para um ticker — só narrativa factual.
 * Nunca altera OHLC/precedentes; falha silenciosa (null) se feeds caírem.
 */
export async function buildNewsContextForTicker(
  ticker: string,
): Promise<NewsContextPayload | null> {
  const coin = coinFromTicker(ticker);
  if (!coin) return null;

  try {
    const all = await fetchNewsFeed();
    const now = Date.now();
    const matched = all
      .filter((item) => {
        if (!itemMatchesCoin(item, coin)) return false;
        if (item.publishedAt != null && now - item.publishedAt > MAX_AGE_MS) return false;
        return true;
      })
      .slice(0, MAX_ITEMS)
      .map(toContextItem);

    return {
      ticker: ticker.trim().toUpperCase(),
      coin,
      items: matched,
      fetchedAt: now,
      disclaimer: NEWS_CONTEXT_DISCLAIMER,
    };
  } catch (err) {
    console.warn("[news/context-for-ticker] falhou (não bloqueia análise):", err);
    return null;
  }
}
