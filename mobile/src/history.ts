import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StoredAnalysis } from "./types";

const KEY = "precedente.history.v1";
const MAX = 20;

export async function loadHistory(): Promise<StoredAnalysis[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredAnalysis[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveHistory(items: StoredAnalysis[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
  } catch {
    try {
      const slim = items.slice(0, MAX).map((a) => ({ ...a, thumbUri: null }));
      await AsyncStorage.setItem(KEY, JSON.stringify(slim));
    } catch {
      /* ignore */
    }
  }
}

export async function pushHistory(
  current: StoredAnalysis[],
  next: StoredAnalysis,
): Promise<StoredAnalysis[]> {
  const items = [next, ...current.filter((a) => a.id !== next.id)].slice(0, MAX);
  await saveHistory(items);
  return items;
}
