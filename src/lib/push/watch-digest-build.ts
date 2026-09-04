/**
 * Monta o corpo do digest diário da watch — só estado de prevenção.
 * Sem linguagem de compra/venda/entrada.
 */

import type { AnalysisPayload } from "../market/types.ts";
import type { MoversSnapshot } from "../market/movers-24h.ts";
import { formatMoversForPush } from "../market/movers-24h.ts";
import type { WatchTarget } from "./types.ts";

export type WatchDigestLine = {
  ticker: string;
  displayTicker: string;
  timeframe: string;
  sampleNote: string;
  matches: number;
  medianDrawdownPct: number | null;
  last: number;
  rsi14: number | null;
  flags: string[];
};

function horizon10(payload: AnalysisPayload) {
  return payload.precedent.horizons.find((h) => h.bars === 10) ?? payload.precedent.horizons[1] ?? null;
}

export function buildWatchDigestLine(
  payload: AnalysisPayload,
  watch: WatchTarget,
  drawdownThresholdPct: number,
): WatchDigestLine {
  const h = horizon10(payload);
  const flags: string[] = [];
  if (payload.precedent.sampleNote !== "ok") {
    flags.push(`amostra ${payload.precedent.sampleNote}`);
  }
  if (h && Math.abs(h.medianDrawdownPct) >= drawdownThresholdPct) {
    flags.push(`DD med ${h.medianDrawdownPct.toFixed(1).replace(".", ",")}%`);
  }
  if (payload.snapshot.near20High) flags.push("perto high20");
  if (payload.snapshot.near20Low) flags.push("perto low20");
  if (watch.priceZone?.enabled) {
    const { min, max } = watch.priceZone;
    const c = payload.snapshot.last.c;
    const inZone = (min == null || c >= min) && (max == null || c <= max);
    if (inZone) flags.push("na zona de preço");
  }
  if (watch.rsiZone?.enabled) {
    const rsi = payload.snapshot.rsi14;
    if (watch.rsiZone.below != null && rsi <= watch.rsiZone.below) flags.push("RSI no piso");
    if (watch.rsiZone.above != null && rsi >= watch.rsiZone.above) flags.push("RSI no teto");
  }
  if (flags.length === 0) flags.push("sem flag de prevenção");

  return {
    ticker: payload.ticker,
    displayTicker: payload.displayTicker,
    timeframe: payload.timeframe,
    sampleNote: payload.precedent.sampleNote,
    matches: payload.precedent.matches,
    medianDrawdownPct: h ? h.medianDrawdownPct : null,
    last: payload.snapshot.last.c,
    rsi14: payload.snapshot.rsi14,
    flags,
  };
}

export function formatWatchDigestBody(
  lines: WatchDigestLine[],
  movers: MoversSnapshot | null,
  maxWatchLines = 8,
): string {
  const parts: string[] = [];
  if (lines.length === 0) {
    parts.push("Watch vazia ou sem análise neste ciclo.");
  } else {
    parts.push("Watch · estado de prevenção:");
    for (const line of lines.slice(0, maxWatchLines)) {
      parts.push(
        `· ${line.displayTicker} ${line.timeframe}: ${line.flags.join(", ")} (n=${line.matches})`,
      );
    }
  }
  if (movers) {
    parts.push("");
    parts.push(formatMoversForPush(movers, 5));
  }
  parts.push("");
  parts.push("Só contexto factual — não é recomendação nem sinal.");
  let body = parts.join("\n");
  if (body.length > 350) body = body.slice(0, 349).trimEnd() + "…";
  return body;
}

export function formatWatchDigestTitle(lines: WatchDigestLine[], hasMovers: boolean): string {
  const flagged = lines.filter((l) => !l.flags.includes("sem flag de prevenção")).length;
  const base =
    flagged > 0
      ? `Digest watch · ${flagged} com flag`
      : `Digest watch · ${lines.length} par(es)`;
  return hasMovers ? `${base} + movers` : base;
}
