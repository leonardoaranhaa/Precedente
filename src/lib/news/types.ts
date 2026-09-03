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
  /** Digest diário no horário local (estilo Automations). */
  digestEnabled: boolean;
  /** Hora local 0–23 em que o cron deve gerar o brief. */
  digestHour: number;
  /** IANA timezone (ex.: America/Sao_Paulo). */
  timezone: string;
  /** Se true e houver pushToken, o scan envia Expo push. */
  pushEnabled: boolean;
  /** Token Expo opcional (ExponentPushToken[…] / ExpoPushToken[…]). */
  pushToken: string | null;
};

export const DEFAULT_NEWS_PREFERENCES: NewsPreferences = {
  coins: [],
  categories: [],
  digestEnabled: true,
  digestHour: 8,
  timezone: "America/Sao_Paulo",
  pushEnabled: true,
  pushToken: null,
};

/** Contexto de manchetes ligado a um ticker — nunca altera % de precedente. */
export type NewsContext = {
  windowHours: number;
  items: Array<{
    id: string;
    title: string;
    link: string;
    source: string;
    publishedAt: number | null;
    coins: string[];
    categories: NewsCategory[];
  }>;
  flags: Record<NewsCategory, boolean>;
};
