export type NewsCategory = "regulatory" | "market" | "security" | "institutional" | "technology";

export const NEWS_CATEGORIES: { id: NewsCategory; label: string }[] = [
  { id: "regulatory", label: "Regulação" },
  { id: "market", label: "Movimentação de mercado" },
  { id: "security", label: "Segurança (hacks/golpes)" },
  { id: "institutional", label: "Institucional (ETFs/fundos)" },
  { id: "technology", label: "Tecnologia/protocolo" },
];

export type NewsItem = {
  /** Link normalizado (sem querystring) — chave de dedupe entre feeds. */
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: number | null;
  /** Tickers detectados no título/descrição (ex.: ["BTC", "ETH"]). */
  coins: string[];
  categories: NewsCategory[];
};

export type NewsPreferences = {
  /** Vazio = todas as moedas. */
  coins: string[];
  /** Vazio = todas as categorias. */
  categories: NewsCategory[];
};

export const DEFAULT_NEWS_PREFERENCES: NewsPreferences = { coins: [], categories: [] };
