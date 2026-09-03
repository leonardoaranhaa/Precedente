import type { NewsItem, NewsPreferences } from "./types";

export type NewsFeedResponse = { items: NewsItem[]; total: number; matched: number };

function qs(prefs?: Partial<NewsPreferences>): string {
  if (!prefs) return "";
  const params = new URLSearchParams();
  if (prefs.coins?.length) params.set("coins", prefs.coins.join(","));
  if (prefs.categories?.length) params.set("categories", prefs.categories.join(","));
  const s = params.toString();
  return s ? `?${s}` : "";
}

/**
 * `override` filtra sem depender do login (útil pra pré-visualizar no
 * modal antes de salvar). Sem `override`, logado usa as preferências
 * salvas no servidor; sem conta, vem tudo.
 */
export async function fetchNewsFeed(override?: Partial<NewsPreferences>): Promise<NewsFeedResponse> {
  const res = await fetch(`/api/news/feed${qs(override)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Não foi possível buscar notícias.");
  }
  return res.json();
}

export async function getMyNewsPreferences(): Promise<NewsPreferences | null> {
  const res = await fetch("/api/news/preferences");
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Não foi possível carregar suas preferências.");
  return res.json();
}

export async function saveMyNewsPreferences(prefs: NewsPreferences): Promise<NewsPreferences> {
  const res = await fetch("/api/news/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Não foi possível salvar suas preferências.");
  }
  return res.json();
}
