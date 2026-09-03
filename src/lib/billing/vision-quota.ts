/**
 * Cota diária de leitura de print por userId — em memória por processo
 * (mesmo trade-off do rate-limit.ts: 1 réplica Railway). Suficiente para
 * o gate v1; persistir em analysis_log agregada vem depois.
 */

const dayKey = (d = new Date()) => d.toISOString().slice(0, 10); // UTC YYYY-MM-DD

const usage = new Map<string, { day: string; count: number }>();

function bucketKey(userId: string): string {
  return `vision:${userId}`;
}

export function getVisionCountToday(userId: string, now = new Date()): number {
  const row = usage.get(bucketKey(userId));
  if (!row || row.day !== dayKey(now)) return 0;
  return row.count;
}

/** Incrementa após uma leitura de print bem-sucedida (ou tentada com custo). */
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

/** Só testes. */
export function _resetVisionQuotaForTests(): void {
  usage.clear();
}
