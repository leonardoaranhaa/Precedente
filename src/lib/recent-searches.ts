const KEY = "precedente:recent-searches";
const MAX = 8;

export function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(ticker: string): string[] {
  const upper = ticker.toUpperCase().trim();
  if (!upper) return loadRecentSearches();
  const list = loadRecentSearches().filter((t) => t !== upper);
  list.unshift(upper);
  const next = list.slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // quota exceeded — ignore
  }
  return next;
}
