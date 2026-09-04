/**
 * Regras puras de agendamento do digest diário.
 * Cron roda a cada hora; enviamos quando a hora UTC atual == digestHourUtc
 * e ainda não enviamos "hoje" (UTC day).
 */

export function utcDayStart(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function isDigestDue(opts: {
  digestEnabled: boolean;
  digestHourUtc: number;
  lastDigestAt: number | null;
  nowMs?: number;
}): boolean {
  if (!opts.digestEnabled) return false;
  const hour = opts.digestHourUtc;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return false;

  const now = opts.nowMs ?? Date.now();
  const nowDate = new Date(now);
  if (nowDate.getUTCHours() !== hour) return false;

  if (opts.lastDigestAt == null) return true;
  // Já enviou no mesmo dia UTC?
  return utcDayStart(opts.lastDigestAt) < utcDayStart(now);
}

/** Cooldown defensivo: nunca reenviar em menos de 20h mesmo se last_digest_at sumir. */
export function withinHardCooldown(lastDigestAt: number | null, nowMs = Date.now()): boolean {
  if (lastDigestAt == null) return false;
  return nowMs - lastDigestAt < 20 * 60 * 60 * 1000;
}
