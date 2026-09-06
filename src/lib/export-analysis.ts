import {
  barsToHuman,
  formatInt,
  formatPct,
  formatPrice,
  timeframeLabel,
} from "./market/labels.ts";
import { sampleTitle } from "./market/sample-copy.ts";
import type { StoredAnalysis } from "./market/types.ts";

export function analysisSummaryText(a: StoredAnalysis): string {
  const { snapshot, precedent } = a;
  const lines: string[] = [];

  lines.push(`${a.displayTicker} · ${timeframeLabel(a.timeframe)} · ${formatInt(a.candleCount)} candles`);
  lines.push(`Preço: ${formatPrice(snapshot.last.c)} (${formatPct(snapshot.changePct)} vela)`);
  lines.push(`RSI 14: ${snapshot.rsi14.toFixed(1)} · SMA20: ${formatPct(snapshot.distSma20Pct)} · SMA50: ${formatPct(snapshot.distSma50Pct)}`);
  lines.push("");

  lines.push(`Amostra: ${sampleTitle(precedent.sampleNote)} (n=${formatInt(precedent.matches)})`);
  lines.push("");

  for (const h of precedent.horizons) {
    const parts = [
      `${barsToHuman(a.timeframe, h.bars)}:`,
      `${formatPct(h.upPct)} alta · ${formatPct(h.downPct)} baixa`,
      `mediana ${formatPct(h.medianPct)}`,
      `DD ${formatPct(h.medianDrawdownPct)}`,
    ];
    lines.push(parts.join(" "));
  }

  lines.push("");
  lines.push(`Fingerprint: ${precedent.fingerprintLabel}`);

  if (a.onchain?.fundingRate != null) {
    lines.push(`Funding: ${(a.onchain.fundingRate * 100).toFixed(3)}%`);
  }

  lines.push("");
  lines.push("via Precedente");

  return lines.join("\n");
}

export async function copyAnalysis(a: StoredAnalysis): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(analysisSummaryText(a));
    return true;
  } catch {
    return false;
  }
}

export async function shareAnalysis(a: StoredAnalysis): Promise<boolean> {
  const text = analysisSummaryText(a);
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: `${a.displayTicker} · Precedente`,
        text,
      });
      return true;
    } catch {
      return false;
    }
  }
  return copyAnalysis(a);
}
