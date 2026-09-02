/**
 * "52% subiu" não diz nada sozinho — precisa da base incondicional do par
 * pra dizer se é ruído (a base já é 51%) ou informação (a base é 30%).
 * Diferenças pequenas (abaixo do piso de ruído) mostram "em linha com a
 * base" em vez de um número que sugere precisão que a amostra não tem.
 */
const NOISE_FLOOR_PTS = 3;

export function baselineDeltaLabel(conditionalUpPct: number, baselineUpPct: number): string {
  const delta = Math.round(conditionalUpPct - baselineUpPct);
  if (Math.abs(delta) < NOISE_FLOOR_PTS) return "em linha com a base do par";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta} pts vs. a base do par`;
}
