import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { API_BASE_URL } from "./config";
import type { AlertRules } from "./alert-settings";
import type { WatchItem } from "./watchlist";
import { hapticForPushKind } from "./haptics";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    hapticForPushKind(notification.request.content.data?.kind);
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("precedente-alerts", {
    name: "Alertas de prevenção",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: "#c4a574",
    description: "Amostra, regime, drawdown, extremos, funding e volume.",
  });
}

export async function registerForPushAsync(): Promise<string | null> {
  await ensureAndroidChannel();

  if (!Device.isDevice) {
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    final = req.status;
  }
  if (final !== "granted") return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn("[push] EAS projectId ausente no app.json");
    return null;
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data;
  return token;
}

export async function syncPushSubscription(input: {
  token: string | null;
  watches: WatchItem[];
  rules: AlertRules;
}): Promise<{ ok: boolean; error?: string }> {
  if (!input.token || !input.rules.enabled) {
    if (input.token && !input.rules.enabled) {
      try {
        await fetch(`${API_BASE_URL}/api/push/register`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: input.token }),
        });
      } catch {
        /* ignore */
      }
    }
    return { ok: true };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/push/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: input.token,
        platform: Platform.OS,
        watches: input.watches.map((w) => ({
          ticker: w.ticker,
          timeframe: w.timeframe,
          displayTicker: w.displayTicker,
          ...(w.priceZone ? { priceZone: w.priceZone } : {}),
          ...(w.rsiZone ? { rsiZone: w.rsiZone } : {}),
        })),
        rules: {
          sampleWeak: input.rules.sampleWeak,
          sampleRegime: input.rules.sampleRegime,
          drawdownPath: input.rules.drawdownPath,
          drawdownThresholdPct: input.rules.drawdownThresholdPct,
          extreme20: input.rules.extreme20,
          fundingExtreme: input.rules.fundingExtreme,
          fundingThreshold: input.rules.fundingThreshold,
          volumeAnomaly: input.rules.volumeAnomaly,
          volumeMultiple: input.rules.volumeMultiple,
        },
        digestEnabled: input.rules.digestEnabled,
        digestHourUtc: input.rules.digestHourUtc,
        includeMovers: input.rules.includeMovers,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: body?.error ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Falha de rede ao registrar push." };
  }
}

export async function requestPushScan(cronSecret?: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/push/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cronSecret ? { "X-Cron-Secret": cronSecret } : {}),
      },
      body: "{}",
    });
  } catch {
    /* silencioso */
  }
}
