/**
 * Resumo semanal de risco — contagem de alertas de prevenção no período.
 */

export type WeeklyRiskCounts = {
  sample_weak: number;
  sample_regime: number;
  drawdown_path: number;
  extreme_20: number;
  price_zone: number;
  rsi_zone: number;
  funding_extreme: number;
  volume_anomaly: number;
  dex_drain: number;
};

export const EMPTY_WEEKLY: WeeklyRiskCounts = {
  sample_weak: 0,
  sample_regime: 0,
  drawdown_path: 0,
  extreme_20: 0,
  price_zone: 0,
  rsi_zone: 0,
  funding_extreme: 0,
  volume_anomaly: 0,
  dex_drain: 0,
};

const LABELS: Record<keyof WeeklyRiskCounts, string> = {
  sample_weak: "amostra fraca",
  sample_regime: "regime de amostra",
  drawdown_path: "drawdown do caminho",
  extreme_20: "extremo 20 barras",
  price_zone: "zona de preço",
  rsi_zone: "zona de RSI",
  funding_extreme: "funding elevado",
  volume_anomaly: "volume anômalo",
  dex_drain: "drenagem DEX",
};

export function countRiskFromLastSent(
  lastSent: Record<string, number>,
  windowStartMs: number,
  nowMs = Date.now(),
): WeeklyRiskCounts {
  const out = { ...EMPTY_WEEKLY };
  for (const [key, ts] of Object.entries(lastSent)) {
    if (typeof ts !== "number" || ts < windowStartMs || ts > nowMs) continue;
    if (key.startsWith("_")) continue;
    const kind = key.split(":").pop() as keyof WeeklyRiskCounts | undefined;
    if (kind && kind in out) {
      out[kind] += 1;
    }
  }
  return out;
}

export function formatWeeklyRiskBody(counts: WeeklyRiskCounts, watchCount: number): string {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const parts = [`Resumo semanal de prevenção (${watchCount} par(es) na Watch):`];
  if (total === 0) {
    parts.push("Nenhum alerta de prevenção registrado nesta janela.");
  } else {
    for (const [k, n] of Object.entries(counts) as [keyof WeeklyRiskCounts, number][]) {
      if (n > 0) parts.push(`· ${LABELS[k]}: ${n}`);
    }
    parts.push(`Total de avisos: ${total}.`);
  }
  parts.push("");
  parts.push("Contagem de avisos de contexto — não é ranking de operações nem acerto de trade.");
  let body = parts.join("\n");
  if (body.length > 350) body = body.slice(0, 349).trimEnd() + "…";
  return body;
}

export function formatWeeklyRiskTitle(total: number): string {
  return total > 0 ? `Resumo semanal · ${total} aviso(s)` : "Resumo semanal · sem avisos";
}
