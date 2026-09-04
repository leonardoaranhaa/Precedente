/**
 * Alerta de drenagem — token de ciclo curto no DEX cujo fluxo piora.
 *
 * Mesmo padrão de sample-regime.ts (transição de estado, código guardado em
 * lastSent), aplicado ao motor de fragilidade em vez do motor de precedente.
 *
 * DECISÃO DE ESCOPO: só as flags que descrevem fluxo AGORA contam pra
 * severidade — liquidez_baixa, giro_extremo, pressao_venda, volume_esfriando.
 * par_novo e saida_estreita ficam de fora: são fatos estruturais (idade do
 * par, relação liquidez/market cap), verdadeiros a vida inteira do par, não
 * evidência de que ele está sendo drenado neste momento. Um par pode nascer
 * fino e continuar fino sem nunca "drenar" — drenagem é MUDANÇA de fluxo.
 *
 * Dispara só ao PIORAR. Nunca "recuperou": um par quase morto pode sair de
 * volume_esfriando simplesmente porque o volume foi a zero em toda janela —
 * isso não significa que o dinheiro voltou. Alertar "melhorou" nesse caso
 * seria reafirmação falsa, o oposto do que "prevenção de perda" promete.
 */

import type { DexFragilityReport, FragilityFlag, FragilityFlagId } from "@/lib/market/dex";

const ACTIVE_FLAGS: ReadonlySet<FragilityFlagId> = new Set([
  "liquidez_baixa",
  "giro_extremo",
  "pressao_venda",
  "volume_esfriando",
]);

export type DrainLevel = "none" | "watch" | "drain";

function activeFlags(report: DexFragilityReport): FragilityFlag[] {
  return report.flags.filter((f) => ACTIVE_FLAGS.has(f.id));
}

/** 2+ flags ativas de severidade alta = drenagem; 1+ ativa (qualquer severidade) = observar. */
export function drainLevel(report: DexFragilityReport): DrainLevel {
  const active = activeFlags(report);
  const activeAlta = active.filter((f) => f.severity === "alta").length;
  if (activeAlta >= 2) return "drain";
  if (active.length >= 1) return "watch";
  return "none";
}

export function drainLevelCode(level: DrainLevel): number {
  return level === "drain" ? 2 : level === "watch" ? 1 : 0;
}

function levelFromCode(code: number): DrainLevel {
  if (code >= 2) return "drain";
  if (code >= 1) return "watch";
  return "none";
}

export function dexDrainStateKey(ticker: string): string {
  return `${ticker.toUpperCase()}:_dex_drain`;
}

export type DrainTransition = {
  from: DrainLevel;
  to: DrainLevel;
  flags: FragilityFlag[];
};

/**
 * `prevCode` vem de lastSent[dexDrainStateKey(ticker)] — undefined na primeira
 * vez que essa subscription vê o par. Nesse caso só dispara se JÁ nasce em
 * "drain" (o nível máximo, que não tem "piora" seguinte pra detectar): pinar
 * um token que já está sendo drenado precisa avisar imediatamente, não ficar
 * mudo esperando uma transição que o teto do nível nunca permite acontecer.
 */
export function detectDrainTransition(
  prevCode: number | undefined,
  report: DexFragilityReport,
): DrainTransition | null {
  const to = drainLevel(report);
  const toCode = drainLevelCode(to);

  if (prevCode == null) {
    return to === "drain" ? { from: "none", to, flags: activeFlags(report) } : null;
  }
  if (toCode <= prevCode) return null;

  return { from: levelFromCode(prevCode), to, flags: activeFlags(report) };
}

export function drainTitle(displayTicker: string, t: DrainTransition): string {
  if (t.to === "drain") return `${displayTicker} · drenagem ativa`;
  return `${displayTicker} · fluxo piorando`;
}

export function drainBody(t: DrainTransition): string {
  const flagList = t.flags.map((f) => f.label.toLowerCase()).join(", ");
  const lead =
    t.to === "drain"
      ? "Dois ou mais sinais de fluxo ativos ao mesmo tempo"
      : "Sinal de fluxo apareceu";
  return `${lead}: ${flagList}. Estado do par agora — não é estatística de caminho nem ordem de compra ou venda.`;
}
