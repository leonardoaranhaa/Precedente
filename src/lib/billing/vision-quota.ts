/**
 * Cota diária de leitura de print por userId — em memória por processo
 * (mesmo trade-off do rate-limit.ts: 1 réplica Railway).
 */

import { resolvePlanLimits } from "./plan-limits.ts";

const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

const usage = new Map<string, { day: string; count: number }>();

function bucketKey(userId: string): string {
  return `vision:${userId}`;
}

export function getVisionCountToday(userId: string, now = new Date()): number {
  const row = usage.get(bucketKey(userId));
  if (!row || row.day !== dayKey(now)) return 0;
  return row.count;
}

export function incrementVisionCount(userId: string, now = new Date()): number {
  const day = dayKey(now);
  const key = bucketKey(userId);
  const row = usage.get(key);
  if (!row || row.day !== day) {
    usage.set(key, { day, count: 1 });
    return 1;
  }
  row.count += 1;
  return row.count;
}

export type VisionQuotaSnapshot = {
  used: number;
  limit: number;
  remaining: number;
  nearLimit: boolean;
  exhausted: boolean;
  message: string | null;
};

export function getVisionQuotaSnapshot(
  userId: string,
  isPremium: boolean,
  now = new Date(),
): VisionQuotaSnapshot {
  const limit = resolvePlanLimits(isPremium).visionPerDay;
  const used = getVisionCountToday(userId, now);
  const remaining = Math.max(0, limit - used);
  const exhausted = remaining <= 0;
  const nearLimit = remaining <= 1;
  let message: string | null = null;
  if (exhausted) {
    message = `Cota de leitura de print esgotada hoje (${used}/${limit}, UTC). Volta amanhã ou no Premium — só limite operacional, não é leitura de mercado.`;
  } else if (remaining === 1) {
    message = `Resta 1 leitura de print hoje (${used}/${limit}, UTC). Só cota do plano — não altera a análise estatística.`;
  } else if (nearLimit) {
    message = `Cota de print perto do limite (${used}/${limit}, UTC).`;
  }
  return { used, limit, remaining, nearLimit, exhausted, message };
}

export function _resetVisionQuotaForTests(): void {
  usage.clear();
}
