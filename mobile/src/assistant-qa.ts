import { formatInt, formatPct, timeframeLabel } from "./format";
import type { StoredAnalysis } from "./types";

export type AssistantQuestionId = "path" | "sample" | "liquidity";

export type AssistantQuestion = {
  id: AssistantQuestionId;
  label: string;
};

export const ASSISTANT_QUESTIONS: AssistantQuestion[] = [
  { id: "path", label: "E o caminho?" },
  { id: "sample", label: "E a amostra?" },
  { id: "liquidity", label: "E liquidez / funding?" },
];

function midHorizon(a: StoredAnalysis) {
  const hs = a.precedent.horizons;
  return hs.find((h) => h.bars === 10) ?? hs[Math.min(1, hs.length - 1)] ?? null;
}

function formatUsd(n: number): string {
  if (n >= 1_000_000_000) return `US$ ${(n / 1_000_000_000).toFixed(2)} bi`;
  if (n >= 1_000_000) return `US$ ${(n / 1_000_000).toFixed(2)} mi`;
  if (n >= 1_000) return `US$ ${(n / 1_000).toFixed(0)} mil`;
  return `US$ ${n.toFixed(0)}`;
}

export function answerAssistantQuestion(
  analysis: StoredAnalysis,
  id: AssistantQuestionId,
): string {
  if (id === "path") {
    const h = midHorizon(analysis);
    if (!h) {
      return "Não há horizonte calculado nesta análise para descrever o caminho.";
    }
    return (
      `No horizonte de ${h.bars} barras (${timeframeLabel(analysis.timeframe)}): ` +
      `queda típica no caminho ${formatPct(h.medianDrawdownPct)}, ` +
      `pior trajetória ${formatPct(h.worstDrawdownPct)}, ` +
      `alta típica no meio ${formatPct(h.medianRunupPct)}. ` +
      `No fim, mediana ${formatPct(h.medianPct)} ` +
      `(↑${Math.round(h.upPct)}% / ↓${Math.round(h.downPct)}% / lado ${Math.round(h.flatPct)}%). ` +
      `O caminho é o que estressa posição alavancada — não o ponto final sozinho.`
    );
  }

  if (id === "sample") {
    const p = analysis.precedent;
    const note =
      p.sampleNote === "tiny"
        ? "Amostra muito pequena: use só como ilustração."
        : p.sampleNote === "small"
          ? "Amostra limitada: leia com cautela."
          : "Amostra razoável para descrever o passado parecido.";
    return (
      `${note} ` +
      `Este fingerprint apareceu ${formatInt(p.matches)} vezes ` +
      `em ${formatInt(analysis.candleCount)} candles (${analysis.source}). ` +
      (p.relaxed.length
        ? `Match com critérios relaxados: ${p.relaxed.join(", ")}.`
        : "Match com critérios completos.") +
      ` Poucos casos = qualquer % fica instável.`
    );
  }

  const o = analysis.onchain;
  if (!o) {
    return "Não há contexto on-chain/funding nesta análise (fonte indisponível ou sem dados para o par).";
  }
  const bits: string[] = [];
  if (o.fundingRate != null) {
    const pct = o.fundingRate * 100;
    bits.push(
      `Funding ${pct >= 0 ? "+" : ""}${pct.toFixed(4).replace(".", ",")}% ` +
        (o.fundingRate > 0
          ? "(longs pagam shorts)."
          : o.fundingRate < 0
            ? "(shorts pagam longs)."
            : "(neutro)."),
    );
  }
  if (o.liquidityUsd != null) bits.push(`Liquidez DEX ≈ ${formatUsd(o.liquidityUsd)}.`);
  if (o.volume24hUsd != null) bits.push(`Vol 24h ≈ ${formatUsd(o.volume24hUsd)}.`);
  if (o.volume6hUsd != null) bits.push(`Vol 6h ≈ ${formatUsd(o.volume6hUsd)}.`);
  if (o.pairAgeHours != null) {
    bits.push(
      o.pairAgeHours < 48
        ? `Par recente (~${Math.round(o.pairAgeHours)}h).`
        : `Idade do par ~${Math.round(o.pairAgeHours / 24)}d.`,
    );
  }
  if (bits.length === 0) {
    return "On-chain veio vazio para funding e liquidez neste snapshot.";
  }
  return bits.join(" ") + " Contexto de pressão e profundidade — não ordem de direção.";
}
