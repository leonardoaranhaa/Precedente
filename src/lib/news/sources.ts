export type NewsSource = { name: string; url: string };

/**
 * Feeds RSS/Atom públicos, sem chave de API — mesmo espírito de
 * Binance/DexScreener no resto do app. Um feed fora do ar não derruba os
 * outros (ver `aggregate.ts`); a lista pode crescer sem mudar lógica nenhuma.
 */
export const NEWS_SOURCES: NewsSource[] = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
  { name: "Bitcoin.com News", url: "https://news.bitcoin.com/feed/" },
];
