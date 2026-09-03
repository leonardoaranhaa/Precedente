import { listSubscriptions } from "./store";
import { getSql } from "@/lib/db";
import type { PushSubscription } from "./types";

const memoryDigest = new Map<string, number>();

export async function listDigestSubscriptions(): Promise<PushSubscription[]> {
  const all = await listSubscriptions();
  return all.filter((s) => s.digestEnabled === true);
}

export async function markDigestSent(token: string, at = Date.now()): Promise<void> {
  memoryDigest.set(token, at);
  try {
    const sql = await getSql();
    await sql.query(
      `UPDATE push_subscriptions
       SET last_digest_at = to_timestamp($2 / 1000.0), updated_at = now()
       WHERE token = $1`,
      [token, at],
    );
  } catch (err) {
    console.warn("[push/digest-helpers] markDigestSent:", err);
  }
}
