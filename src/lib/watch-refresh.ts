import {
  WATCH_REFRESH_MINUTES,
  type WatchRefreshMinutes,
} from "./market/types";

const KEY = "precedente.watchRefreshMin.v1";

export function loadWatchRefreshMinutes(): WatchRefreshMinutes {
  try {
    const raw = localStorage.getItem(KEY);
    const n = Number(raw);
    if ((WATCH_REFRESH_MINUTES as readonly number[]).includes(n)) {
      return n as WatchRefreshMinutes;
    }
  } catch {
    /* private mode */
  }
  return 0;
}

export function saveWatchRefreshMinutes(v: WatchRefreshMinutes): void {
  try {
    localStorage.setItem(KEY, String(v));
  } catch {
    /* quota */
  }
}

export function watchRefreshLabel(v: WatchRefreshMinutes): string {
  if (v === 0) return "off";
  return `${v}m`;
}
