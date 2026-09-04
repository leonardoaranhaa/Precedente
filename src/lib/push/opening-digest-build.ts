/**
 * Texto do "precedente de abertura" — TFs 4h/1d, só estatística de caminho.
 */

import type { AnalysisPayload } from "@/lib/market/types";

export type OpeningLine = {
  displayTicker: string;
  timeframe: string;
  sampleNote: string;
  matches: number;
  medianPct: number | null;
  p10: number | null;
  p90: number | null;
  medianDd: number | null;
  baselineDd: number | null;
};

function horizonPrimary(payload: AnalysisPayload) {
  const hs = payload.precedent.horizons;
  return hs.find((h) => h.bars === 10) ?? hs[0] ?? null;
}

export function buildOpeningLine(payload: AnalysisPayload): OpeningLine {
  const h = horizonPrimary(payload);
  return {
    displayTicker: payload.displayTicker,
    timeframe: payload.timeframe,
    sampleNote: payload.precedent.sampleNote,
    matches: payload.precedent.matches,
    medianPct: h?.medianPct ?? null,
    p10: h?.p10 ?? null,
    p90: h?.p90 ?? null,
    medianDd: h?.medianDrawdownPct ?? null,
    baselineDd: h?.baseline.medianDrawdownPct ?? null,
  };
}

function pct(n: number): string {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(1).replace(".", ",")}%`;
}

export function formatOpeningBody(lines: OpeningLine[]): string {
  if (lines.length === 0) {
    return "Sem pares 4h/1d na Watch neste ciclo. Só estatística de caminho — não é ordem.";
  }
  const parts = ["Precedente de abertura (4h/1d) — caminho histórico, não previsão:"];
  for (const l of lines.slice(0, 6)) {
    const bits = [`· ${l.displayTicker} ${l.timeframe}`, `n=${l.matches}`, `amostra ${l.sampleNote}`];
    if (l.medianPct != null) bits.push(`med ${pct(l.medianPct)}`);
    if (l.p10 != null && l.p90 != null) bits.push(`P10/P90 ${pct(l.p10)}/${pct(l.p90)}`);
    if (l.medianDd != null) {
      let dd = `DD med ${pct(l.medianDd)}`;
      if (l.baselineDd != null) dd += ` vs base ${pct(l.baselineDd)}`;
      bits.push(dd);
    }
    parts.push(bits.join(" · "));
  }
  parts.push("");
  parts.push("Contexto de prevenção ao retomar a sessão — nunca recomendação de exposição.");
  let body = parts.join("\n");
  if (body.length > 350) body = body.slice(0, 349).trimEnd() + "…";
  return body;
}

export function formatOpeningTitle(n: number): string {
  return n > 0 ? `Abertura · ${n} par(es) 4h/1d` : "Abertura · sem pares longos";
}
