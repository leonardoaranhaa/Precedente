import type { NewsItem, NewsPreferences } from "./types.ts";

type FilterPrefs = Pick<NewsPreferences, "coins" | "categories">;

/** Lista vazia em `coins`/`categories` = sem filtro naquele eixo (mostra tudo). */
export function matchesPreferences(item: NewsItem, prefs: FilterPrefs): boolean {
  const coinOk = prefs.coins.length === 0 || item.coins.some((c) => prefs.coins.includes(c));
  const categoryOk =
    prefs.categories.length === 0 || item.categories.some((c) => prefs.categories.includes(c));
  return coinOk && categoryOk;
}

export function filterNewsForPreferences(items: NewsItem[], prefs: FilterPrefs): NewsItem[] {
  return items.filter((item) => matchesPreferences(item, prefs));
}
