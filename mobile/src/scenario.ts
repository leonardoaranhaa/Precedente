import { formatPct, timeframeLabel } from "./format";
import type { HorizonOutcome, StoredAnalysis, Timeframe } from "./types";

export type ScenarioKey = "typical_path" | "stress_path" | "median_end";

export type ScenarioInput = {
  capital: number;
  leverage: number;
  horizonBars: number;
  key: ScenarioKey;
};

export type ScenarioResult = {
  key: ScenarioKey;
  keyLabel: string;
  displayTicker: string;
  timeframe: Timeframe;
  timeframeLabel: string;
  capital: number;
  leverage: number;
  notional: number;
  horizonLabel: string;
  movePct: number;
  pnl: number;
  sampleNote: "ok" | "small" | "tiny";
  sampleWarning: string | null;
  timeNote: string;
  lines: string[];
  disclaimer: string;
};

export const SCENARIO_KEYS: { id: ScenarioKey; label: string; hint: string }[] = [
  {
    id: "typical_path",
    label: "Caminho típico",
    hint: "Queda mediana no meio do caminho",
  },
  {
    id: "stress_path",
    label: "Caminho estressado",
    hint: "Pior drawdown da amostra",
  },
  {
    id: "median_end",
    label: "Desfecho mediano",
    hint: "Mediana do retorno no fim",
  },
];

const DISCLAIMER =
  "Encenação hipotética sobre o ativo em foco, com base em frequência e caminho no passado parecido. " +
  "Não é previsão, não é ordem de compra, venda, long ou short, e não diz o que você deve fazer. " +
  "Qualquer decisão — no verde ou no vermelho — é inteiramente sua.";

function pickHorizon(horizons: HorizonOutcome[], bars: number): HorizonOutcome | null {
  return horizons.find((h) => h.bars === bars) ?? horizons[Math.min(1, horizons.length - 1)] ?? null;
}

function minutesPerBar(tf: Timeframe): number {
  switch (tf) {
    case "1m":
      return 1;
    case "5m":
      return 5;
    case "15m":
      return 15;
    case "1h":
      return 60;
    case "4h":
      return 240;
    case "1d":
      return 1440;
  }
}

function timeNote(tf: Timeframe, bars: number): string {
  const mins = minutesPerBar(tf) * bars;
  if (mins <= 5) {
    return `Momento gráfico ${timeframeLabel(tf)}: ${bars} barras ≈ ${mins} min.`;
  }
  if (mins < 60) {
    return `Momento gráfico ${timeframeLabel(tf)}: ${bars} barras ≈ ${mins} min — não é janela de 1–5 min reais.`;
  }
  const h = mins / 60;
  return `Momento gráfico ${timeframeLabel(tf)}: ${bars} barras ≈ ${h % 1 === 0 ? h : h.toFixed(1).replace(".", ",")}h.`;
}

function formatMoney(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(n);
  return `${sign}${abs.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function clampLeverage(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > 5) return 5;
  return Math.round(n * 10) / 10;
}

function clampCapital(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, 10_000_000);
}

export function runScenario(
  analysis: StoredAnalysis,
  input: ScenarioInput | (ScenarioInput & { usd?: number }),
): ScenarioResult | null {
  const raw =
    "capital" in input && input.capital != null
      ? input.capital
      : (input as { usd?: number }).usd ?? 0;
  const capital = clampCapital(raw);
  const leverage = clampLeverage(input.leverage);
  if (capital <= 0) return null;

  const horizon = pickHorizon(analysis.precedent.horizons, input.horizonBars);
  if (!horizon || horizon.samples <= 0) return null;

  const keyMeta = SCENARIO_KEYS.find((k) => k.id === input.key)!;
  const notional = capital * leverage;

  let movePct = 0;
  if (input.key === "typical_path") movePct = horizon.medianDrawdownPct;
  else if (input.key === "stress_path") movePct = horizon.worstDrawdownPct;
  else movePct = horizon.medianPct;

  const pnl = (notional * movePct) / 100;
  const asset = analysis.displayTicker;
  const tf = analysis.timeframe;
  const tfLabel = timeframeLabel(tf);

  const sampleNote = analysis.precedent.sampleNote;
  let sampleWarning: string | null = null;
  if (sampleNote === "tiny") {
    sampleWarning =
      "Amostra muito pequena: trate estes números só como ilustração, não como base de decisão.";
  } else if (sampleNote === "small") {
    sampleWarning =
      "Amostra limitada: a encenação descreve o passado com mais incerteza.";
  }

  const lines: string[] = [
    `Ativo em foco: ${asset} · tempo gráfico ${tfLabel}.`,
    `Hipótese de capital ${formatMoney(capital).replace(/^[+−]/, "")}` +
      (leverage > 1
        ? ` com multiplicador educativo ${leverage}× (notional ${formatMoney(notional).replace(/^[+−]/, "")}).`
        : ".") +
      ` O capital é só unidade de conta — o cenário é sobre ${asset}.`,
    `Chave “${keyMeta.label}”: movimento ${formatPct(movePct)} → ${formatMoney(pnl)} hipotéticos.`,
    `Horizonte: ${horizon.bars} barras (${horizon.label}). n=${horizon.samples}.`,
    "Nada disto é instrução para entrar ou sair. A conta é da plataforma; a escolha é só sua.",
  ];

  return {
    key: input.key,
    keyLabel: keyMeta.label,
    displayTicker: asset,
    timeframe: tf,
    timeframeLabel: tfLabel,
    capital,
    leverage,
    notional,
    horizonLabel: horizon.label,
    movePct,
    pnl,
    sampleNote,
    sampleWarning,
    timeNote: timeNote(tf, horizon.bars),
    lines,
    disclaimer: DISCLAIMER,
  };
}
