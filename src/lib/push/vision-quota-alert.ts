/**
 * Push suave quando a cota de print está no limite.
 * Só envia se houver tokens com userId (register autenticado).
 */

import type { VisionQuotaSnapshot } from "@/lib/billing/vision-quota";
import { listSubscriptionsByUserId, markSent, removeSubscription } from "./store";
import { sendExpoAlerts } from "./expo-send";
import type { AlertEvent } from "./types";

const COOLDOWN_KEY = "_vision_quota_alert";
const COOLDOWN_MS = 12 * 60 * 60 * 1000;

export async function maybeNotifyVisionQuota(
  userId: string,
  snapshot: VisionQuotaSnapshot,
): Promise<{ sent: number; pruned: number }> {
  if (!snapshot.nearLimit || !snapshot.message) return { sent: 0, pruned: 0 };

  let subs;
  try {
    subs = await listSubscriptionsByUserId(userId);
  } catch {
    return { sent: 0, pruned: 0 };
  }
  if (subs.length === 0) return { sent: 0, pruned: 0 };

  const now = Date.now();
  let sent = 0;
  let pruned = 0;

  const event: AlertEvent = {
    kind: "sample_weak",
    ticker: "QUOTA",
    timeframe: "1d",
    displayTicker: "Cota print",
    title: snapshot.exhausted
      ? "Cota de print esgotada hoje"
      : "Cota de print perto do limite",
    body: snapshot.message,
  };

  for (const sub of subs) {
    const last = sub.lastSent[COOLDOWN_KEY] ?? 0;
    if (now - last < COOLDOWN_MS) continue;
    try {
      const result = await sendExpoAlerts(sub.token, [event]);
      if (result.invalidToken) {
        await removeSubscription(sub.token);
        pruned += 1;
        continue;
      }
      if (result.ok > 0) {
        await markSent(sub.token, [COOLDOWN_KEY], now);
        sent += 1;
      }
    } catch {
      /* silencioso */
    }
  }

  return { sent, pruned };
}
