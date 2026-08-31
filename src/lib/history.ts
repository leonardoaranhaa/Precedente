import type { StoredAnalysis } from "./market/types";

const KEY = "precedente.history.v1";
const MAX = 20;

export function loadHistory(): StoredAnalysis[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredAnalysis[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: StoredAnalysis[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
  } catch {
    // quota — drop thumbs and retry once
    try {
      const slim = items.slice(0, MAX).map((a) => ({ ...a, thumb: null }));
      window.localStorage.setItem(KEY, JSON.stringify(slim));
    } catch {
      /* ignore */
    }
  }
}

export function pushHistory(
  current: StoredAnalysis[],
  next: StoredAnalysis,
): StoredAnalysis[] {
  const items = [next, ...current.filter((a) => a.id !== next.id)].slice(0, MAX);
  saveHistory(items);
  return items;
}
