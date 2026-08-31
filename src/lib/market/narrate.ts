import { formatInt, formatPct, timeframeLabel } from "./labels";
import type { HorizonOutcome, OnchainContext, StoredAnalysis } from "./types";

export type ScenarioNarrative = {
  headline: string;
  paragraphs: string[];
  footer: string;
};

function pickHorizon(horizons: HorizonOutcome[], bars = 10): HorizonOutcome | null {
  return horizons.find((h) => h.bars === bars) ?? horizons[Math.min(1, horizons.length - 1)] ?? null;
}

function flowLabel(up: number, down: number, flat: number): string {
  const u = Math.round(up);
  const d = Math.round(down);
  const f = Math.round(flat);
  if (u >= d && u >= f) {
    return `na maioria das vezes o preço fechou mais alto no fim do horizonte (${u}% subiu, ${d}% caiu, ${f}% ficou de lado)`;
  }
  if (d >= u && d >= f) {
    return `na maioria das vezes o preço fechou mais baixo no fim do horizonte (${d}% caiu, ${u}% subiu, ${f}% ficou de lado)`;
  }
  return `o desfecho ficou dividido — ${u}% subiu, ${d}% caiu, ${f}% ficou de lado`;
}

function formatUsdCompact(n: number): string {
  if (n >= 1_000_000_000) return `US$ ${(n / 1_000_000_000).toFixed(2)} bi`;
  if (n >= 1_000_000) return `US$ ${(n / 1_000_000).toFixed(2)} mi`;
  if (n >= 1_000) return `US$ ${(n / 1_000).toFixed(0)} mil`;
  return `US$ ${n.toFixed(0)}`;
}

function onchainParagraph(onchain: OnchainContext): string | null {
  const bits: string[] = [];

  if (onchain.fundingRate != null && Number.isFinite(onchain.fundingRate)) {
    const pct = onchain.fundingRate * 100;
    const sign = pct > 0 ? "+" : "";
    const who =
      onchain.fundingRate > 0
        ? "longs pagando shorts (pressão de alavancagem comprada)"
        : onchain.fundingRate < 0
          ? "shorts pagando longs (pressão de alavancagem vendida)"
          : "funding neutro";
    bits.push(`Funding atual em ${sign}${pct.toFixed(4).replace(".", ",")}% — ${who}.`);
  }
  if (onchain.openInterest != null && Number.isFinite(onchain.openInterest)) {
    bits.push(
      `Open interest em cerca de ${formatInt(Math.round(onchain.openInterest))} contratos no perp listado.`,
    );
  }
  if (onchain.liquidityUsd != null && Number.isFinite(onchain.liquidityUsd)) {
    const chain = onchain.chainId ? ` em ${onchain.chainId}` : "";
    const dex = onchain.dexId ? ` (${onchain.dexId})` : "";
    bits.push(
      `No par DEX mais líquido encontrado${chain}${dex}, a liquidez está em torno de ${formatUsdCompact(onchain.liquidityUsd)}.`,
    );
  }
  if (onchain.volume24hUsd != null && Number.isFinite(onchain.volume24hUsd)) {
    bits.push(`Volume DEX 24h ≈ ${formatUsdCompact(onchain.volume24hUsd)}.`);
  }
  if (
    onchain.buys24h != null &&
    onchain.sells24h != null &&
    onchain.buys24h + onchain.sells24h > 0
  ) {
    const total = onchain.buys24h + onchain.sells24h;
    const sellShare = Math.round((onchain.sells24h / total) * 100);
    bits.push(
      `Nas últimas 24h on-chain: ${formatInt(onchain.buys24h)} compras e ${formatInt(onchain.sells24h)} vendas de txns indexadas (~${sellShare}% sells).`,
    );
  }

  if (bits.length === 0) return null;

  return (
    bits.join(" ") +
    " Isso descreve pressão de alavancagem e profundidade de mercado — não uma ordem de direção."
  );
}

export function narrateScenario(analysis: StoredAnalysis): ScenarioNarrative {
  const { snapshot, precedent, timeframe, displayTicker, candleCount, source, onchain } =
    analysis;
  const h10 = pickHorizon(precedent.horizons, 10);
  const h5 = pickHorizon(precedent.horizons, 5);
  const h20 = pickHorizon(precedent.horizons, 20);

  const headline = `${displayTicker} · ${timeframeLabel(timeframe)} · leitura de cenário`;
  const paragraphs: string[] = [];

  const nowBits: string[] = [];
  nowBits.push(
    `Neste momento o par está em ${snapshot.last.c.toLocaleString("pt-BR")}, com a última vela em ${formatPct(snapshot.changePct)}.`,
  );
  nowBits.push(
    `RSI 14 em ${snapshot.rsi14.toFixed(1).replace(".", ",")}; distância da SMA20 ${formatPct(snapshot.distSma20Pct)} e da SMA50 ${formatPct(snapshot.distSma50Pct)}.`,
  );
  if (snapshot.near20High) {
    nowBits.push("O preço está colado na máxima das últimas 20 barras — região de extremo recente.");
  } else if (snapshot.near20Low) {
    nowBits.push("O preço está colado na mínima das últimas 20 barras — região de extremo recente.");
  }
  if (snapshot.lastExtrema) {
    const kind = snapshot.lastExtrema.type === "top" ? "topo" : "fundo";
    nowBits.push(`O último ${kind} local ficou a ${snapshot.lastExtrema.barsAgo} barras.`);
  }
  paragraphs.push(nowBits.join(" "));

  const sample =
    precedent.sampleNote === "tiny"
      ? "A amostra é muito pequena — trate o que segue como ilustração de padrão, não como base firme."
      : precedent.sampleNote === "small"
        ? "A amostra é limitada; os percentuais descrevem o passado parecido com cautela."
        : "A amostra é razoável para descrever o que costumava acontecer depois.";

  paragraphs.push(
    `A condição atual (fingerprint: ${precedent.fingerprintLabel}) já apareceu ${formatInt(precedent.matches)} vezes nesta série de ${formatInt(candleCount)} candles da ${source}. ${sample}` +
      (precedent.relaxed.length > 0
        ? ` O match só fechou com critérios relaxados (${precedent.relaxed.join(", ")}).`
        : ""),
  );

  if (h10) {
    paragraphs.push(
      `Olhando o horizonte de ${h10.bars} barras (${h10.label.split(" · ")[1] ?? h10.label}): ${flowLabel(h10.upPct, h10.downPct, h10.flatPct)}. ` +
        `A mediana do retorno até o fim foi ${formatPct(h10.medianPct)}; a faixa entre o pior e o melhor décimo ficou de ${formatPct(h10.p10)} a ${formatPct(h10.p90)}. ` +
        `Isso não diz o que “os players farão agora” — só resume o desfecho histórico quando o setup se parecia com este.`,
    );
    paragraphs.push(
      `No caminho até lá, a queda típica entre a condição e o fim do horizonte foi ${formatPct(h10.medianDrawdownPct)}, com a pior trajetória registrada em ${formatPct(h10.worstDrawdownPct)}. ` +
        `A alta típica no meio do trajeto ficou em ${formatPct(h10.medianRunupPct)}. ` +
        `Quem só olha o ponto final costuma ignorar essa oscilação intermediária — é aí que o padrão de pressão costuma aparecer nos precedentes.`,
    );
  }

  const shortBits: string[] = [];
  if (h5) {
    shortBits.push(
      `Em ${h5.bars} barras: ↑${Math.round(h5.upPct)}% / ↓${Math.round(h5.downPct)}%, mediana ${formatPct(h5.medianPct)}.`,
    );
  }
  if (h20) {
    shortBits.push(
      `Em ${h20.bars} barras: ↑${Math.round(h20.upPct)}% / ↓${Math.round(h20.downPct)}%, mediana ${formatPct(h20.medianPct)}.`,
    );
  }
  if (shortBits.length) {
    paragraphs.push(`Outros horizontes no mesmo setup: ${shortBits.join(" ")}`);
  }

  if (precedent.recentMatches.length > 0) {
    const list = precedent.recentMatches
      .slice(0, 3)
      .map((m) => {
        const dir = m.forward >= 0 ? "fechou positivo" : "fechou negativo";
        return `${dir} (${formatPct(m.forward)})`;
      })
      .join("; ");
    paragraphs.push(
      `Nas ocorrências mais recentes deste fingerprint, o mercado ${list}. São exemplos isolados dentro da distribuição — não uma sequência que “se repete por obrigação”.`,
    );
  }

  if (onchain) {
    const oc = onchainParagraph(onchain);
    if (oc) paragraphs.push(oc);
  }

  return {
    headline,
    paragraphs,
    footer:
      "Isto descreve frequência, liquidez e pressão de alavancagem. Não é ordem de compra, venda, long ou short — e o passado não garante o próximo movimento.",
  };
}
