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

export type SendExpoResult = {
  ok: number;
  failed: number;
  /** Token inválido / DeviceNotRegistered — caller deve podar a subscription. */
  invalidToken: boolean;
};

export async function sendExpoAlerts(
  token: string,
  events: AlertEvent[],
): Promise<SendExpoResult> {
  if (events.length === 0) return { ok: 0, failed: 0, invalidToken: false };

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
      // dex_drain não tem timeframe (o token não tem candle) — omite em vez
      // de mandar null, que quebraria o Record<string, string> do Expo.
      ...(ev.timeframe ? { timeframe: ev.timeframe } : {}),
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
  let invalidToken = false;
  for (const t of tickets) {
    if (t.status === "ok") {
      ok += 1;
      continue;
    }
    failed += 1;
    const code = t.details?.error ?? t.message ?? "";
    if (
      /DeviceNotRegistered|InvalidCredentials|InvalidToken/i.test(code) ||
      /not a registered push/i.test(code)
    ) {
      invalidToken = true;
    }
  }
  return { ok, failed, invalidToken };
}
