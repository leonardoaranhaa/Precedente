/**
 * Agenda de digest — pura, sem DB. Espelha o modelo Grok Automations:
 * job diário na hora local do usuário, uma run por dia civil local.
 */

export function localHour(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone,
  }).formatToParts(now);
  const hour = parts.find((p) => p.type === "hour")?.value;
  const n = hour != null ? Number(hour) : NaN;
  // Alguns runtimes devolvem "24" para meia-noite.
  if (n === 24) return 0;
  return Number.isFinite(n) ? n : 0;
}

/** YYYY-MM-DD no fuso do usuário (chave de UNIQUE do digest). */
export function localDateKey(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export type DigestDueInput = {
  digestEnabled: boolean;
  digestHour: number;
  timezone: string;
  /** Já existe digest para este run_date? */
  alreadyRanToday: boolean;
  /** Força geração (botão "Rodar agora"). */
  force?: boolean;
  now?: Date;
};

/**
 * True se devemos gerar o digest agora.
 * - force: sempre (se enabled), ignora hora e alreadyRan
 * - senão: enabled && !alreadyRan && hora local === digestHour
 */
export function shouldRunDigest(input: DigestDueInput): boolean {
  if (!input.digestEnabled) return false;
  if (input.force) return true;
  if (input.alreadyRanToday) return false;
  const now = input.now ?? new Date();
  const hour = localHour(now, input.timezone);
  return hour === input.digestHour;
}

/** Corpo neutro do push — sem linguagem de ordem. */
export function formatDigestPushBody(
  items: Array<{ title: string; categories: string[] }>,
): { title: string; body: string } {
  const n = items.length;
  const title = "Brief de notícias · Precedente";
  if (n === 0) {
    return {
      title,
      body: "Nenhuma manchete bateu seus filtros nas últimas horas. Contexto, não sinal.",
    };
  }
  const top = items[0]?.title?.slice(0, 80) ?? "";
  const severe = items.filter((i) =>
    i.categories.some((c) => c === "security" || c === "regulatory"),
  ).length;
  const severeNote = severe > 0 ? ` · ${severe} com tema regulação/segurança` : "";
  return {
    title,
    body: `${n} item${n === 1 ? "" : "s"}${severeNote}. ${top}${top.length >= 80 ? "…" : ""} — só contexto, não é ordem de compra ou venda.`,
  };
}
