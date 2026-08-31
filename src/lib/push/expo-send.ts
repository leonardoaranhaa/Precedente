import type { AlertEvent } from "./types";

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  sound?: "default" | null;
  data?: Record<string, string>;
  priority?: "default" | "normal" | "high";
  channelId?: string;
};

type ExpoTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

/**
 * Envia via Expo Push API (https://exp.host/--/api/v2/push/send).
 * Tokens Expo começam com ExponentPushToken[…] ou ExpoPushToken[…].
 */
export async function sendExpoAlerts(
  token: string,
  events: AlertEvent[],
): Promise<{ ok: number; failed: number }> {
  if (events.length === 0) return { ok: 0, failed: 0 };

  const messages: ExpoMessage[] = events.map((ev) => ({
    to: token,
    title: ev.title,
    body: ev.body,
    sound: "default",
    priority: "high",
    channelId: "precedente-alerts",
    data: {
      kind: ev.kind,
      ticker: ev.ticker,
      timeframe: ev.timeframe,
      displayTicker: ev.displayTicker,
    },
  }));

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    throw new Error(`Expo Push HTTP ${res.status}`);
  }

  const json = (await res.json()) as { data?: ExpoTicket | ExpoTicket[] };
  const tickets = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];
  let ok = 0;
  let failed = 0;
  for (const t of tickets) {
    if (t.status === "ok") ok += 1;
    else failed += 1;
  }
  return { ok, failed };
}
