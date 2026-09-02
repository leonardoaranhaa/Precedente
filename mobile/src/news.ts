import { API_BASE_URL } from "./config";
import { currentAuthHeader } from "./auth";

export type NewsCategory = "regulatory" | "market" | "security" | "institutional" | "technology";

export const NEWS_CATEGORIES: { id: NewsCategory; label: string }[] = [
  { id: "regulatory", label: "Regulação" },
  { id: "market", label: "Movimentação de mercado" },
  { id: "security", label: "Segurança (hacks/golpes)" },
  { id: "institutional", label: "Institucional (ETFs/fundos)" },
  { id: "technology", label: "Tecnologia/protocolo" },
];

// Mesma lista de `src/lib/news/classify.ts` (web) — mantida em espelho porque
// o mobile não compartilha bundle com o servidor.
export const KNOWN_COINS = [
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "ADA",
  "DOGE",
  "BNB",
  "AVAX",
  "LINK",
  "DOT",
  "LTC",
  "TRX",
  "SHIB",
  "UNI",
  "ATOM",
  "NEAR",
  "APT",
  "ARB",
  "OP",
  "ZEC",
];

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: number | null;
  coins: string[];
  categories: NewsCategory[];
};

export type NewsPreferences = { coins: string[]; categories: NewsCategory[] };

export const DEFAULT_NEWS_PREFERENCES: NewsPreferences = { coins: [], categories: [] };

type NewsFeedResponse = { items: NewsItem[]; total: number; matched: number };

export async function fetchNewsFeed(): Promise<NewsFeedResponse> {
  const headers = await currentAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/news/feed`, { headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Não foi possível buscar notícias.");
  }
  return body as NewsFeedResponse;
}

export async function getMyNewsPreferences(): Promise<NewsPreferences | null> {
  const headers = await currentAuthHeader();
  if (!headers.Authorization) return null;
  const res = await fetch(`${API_BASE_URL}/api/news/preferences`, { headers });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Não foi possível carregar suas preferências.");
  return res.json();
}

export async function saveMyNewsPreferences(prefs: NewsPreferences): Promise<NewsPreferences> {
  const headers = await currentAuthHeader();
  const res = await fetch(`${API_BASE_URL}/api/news/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(prefs),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Não foi possível salvar suas preferências.");
  }
  return body as NewsPreferences;
}
