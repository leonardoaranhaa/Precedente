const NOISE_FLOOR_PTS = 3;

export function baselineDeltaLabel(conditionalUpPct: number, baselineUpPct: number): string {
  const delta = Math.round(conditionalUpPct - baselineUpPct);
  if (Math.abs(delta) < NOISE_FLOOR_PTS) return "em linha com a base do par";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta} pts vs. a base do par`;
}
