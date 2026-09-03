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
  /** Digest diário por push (estilo automação agendada). */
  digestEnabled: boolean;
  /** Hora UTC (0–23) em que o digest deve ser enviado. */
  digestHourUtc: number;
  /**
   * Tokens Expo do dispositivo logado — o push_subscriptions não tem user_id,
   * então o digest guarda os tokens aqui quando o usuário habilita o digest.
   */
  digestTokens: string[];
};

export const DEFAULT_NEWS_PREFERENCES: NewsPreferences = {
  coins: [],
  categories: [],
  digestEnabled: false,
  digestHourUtc: 12,
  digestTokens: [],
};

/** Contexto de notícias anexado à análise — só narrativa histórica, sem sinal. */
export type NewsContextItem = {
  title: string;
  source: string;
  link: string;
  publishedAt: number | null;
  coins: string[];
  categories: NewsCategory[];
};

export type NewsContextPayload = {
  /** Ticker normalizado da análise (ex.: BTCUSDT). */
  ticker: string;
  /** Coin base usada no filtro (ex.: BTC). */
  coin: string;
  /** Itens recentes relacionados (máx. ~8). */
  items: NewsContextItem[];
  /** Epoch ms da agregação. */
  fetchedAt: number;
  /** Legenda explícita de prevenção — a UI deve ecoar. */
  disclaimer: string;
};

export const NEWS_CONTEXT_DISCLAIMER =
  "Contexto factual de manchetes recentes. Não é previsão, recomendação nem sinal de entrada/saída.";
