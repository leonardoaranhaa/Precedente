import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  WATCH_REFRESH_MINUTES,
  type WatchRefreshMinutes,
} from "./types";

const KEY = "precedente.watchRefreshMin.v1";

export async function loadWatchRefreshMinutes(): Promise<WatchRefreshMinutes> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const n = Number(raw);
    if ((WATCH_REFRESH_MINUTES as readonly number[]).includes(n)) {
      return n as WatchRefreshMinutes;
    }
  } catch {
    /* */
  }
  return 0;
}

export async function saveWatchRefreshMinutes(v: WatchRefreshMinutes): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, String(v));
  } catch {
    /* */
  }
}

export function watchRefreshLabel(v: WatchRefreshMinutes): string {
  if (v === 0) return "off";
  return `${v}m`;
}
