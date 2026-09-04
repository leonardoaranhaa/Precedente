/**
 * Leitura de FRAGILIDADE para tokens de ciclo curto no DEX (estilo
 * Moonshot / pré-listagem): pares que nascem, giram muito dinheiro em dias e
 * morrem quando quem tem tamanho sai.
 *
 * Por que isto NÃO é o motor de precedentes: precedente exige histórico de
 * candles para responder "quantas vezes isso já aconteceu". Um par de 30h não
 * tem esse histórico — qualquer estatística de caminho ali seria inventada.
 * Então aqui não há mediana, drawdown nem P10/P90: só o estado do par agora,
 * em fatos verificáveis de liquidez e fluxo.
 *
 * Módulo PURO de propósito (sem fetch, sem DB): recebe o contexto já buscado,
 * devolve a leitura. Fica trivialmente testável e nunca entra na disciplina de
 * import dinâmico do analyze.ts.
 */

export type FragilityLevel = "extrema" | "alta" | "media" | "observavel";

export type FragilityFlagId =
  | "par_novo"
  | "liquidez_baixa"
  | "giro_extremo"
  | "pressao_venda"
  | "volume_esfriando"
  | "preco_fino"
  | "saida_estreita";

export type FragilityFlag = {
  id: FragilityFlagId;
  /** Rótulo curto pra chip/badge. */
  label: string;
  /** Frase factual, sem direção de trade. */
  detail: string;
  severity: "alta" | "media";
};

export type DexFragilityInput = {
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  volume6hUsd?: number | null;
  volume1hUsd?: number | null;
  buys24h: number | null;
  sells24h: number | null;
  buys6h?: number | null;
  sells6h?: number | null;
  priceChange24hPct: number | null;
  pairAgeHours: number | null;
  marketCapUsd?: number | null;
};

export type DexFragilityReport = {
  level: FragilityLevel;
  flags: FragilityFlag[];
  metrics: {
    liquidityUsd: number | null;
    volume24hUsd: number | null;
    /** volume 24h ÷ liquidez. Alto = muito dinheiro girando sobre pouca profundidade. */
    turnover24h: number | null;
    /** sells ÷ (buys+sells) nas últimas 24h. */
    sellRatio24h: number | null;
    /** Mesma razão em 6h — serve pra ver mudança recente de fluxo. */
    sellRatio6h: number | null;
    /** (volume 1h × 6) ÷ volume 6h. >1 acelerando, <1 esfriando. */
    volumeTrend: number | null;
    pairAgeHours: number | null;
    marketCapUsd: number | null;
    /** liquidez ÷ valor de mercado. Fração do valor de papel que cabe na pool. */
    liqToMcap: number | null;
  };
  disclaimer: string;
};

/** Uma semana: acima disso o par deixa de ser "de ciclo curto". */
const NOVO_H = 168;
const MUITO_NOVO_H = 48;

const LIQ_BAIXA = 50_000;
const LIQ_MUITO_BAIXA = 10_000;

const GIRO_ALTO = 3;
const GIRO_EXTREMO = 10;

const VENDA_PRESSAO = 0.55;
const VENDA_FORTE = 0.65;

/** Volume da última hora projetado pra 6h contra o realizado — abaixo disso, esfriando. */
const ESFRIANDO = 0.5;

/** Alta forte sobre liquidez rasa: o preço move fácil, não é "força" de mercado. */
const PRECO_FINO_PCT = 30;

/**
 * Liquidez como fração do valor de mercado. É a leitura de saída: se o token
 * "vale" 100M mas só há 200K na pool, o valor de papel não tem por onde sair —
 * é exatamente o padrão em que quem tem tamanho retira e o resto fica preso.
 */
const SAIDA_ESTREITA = 0.05;
const SAIDA_MINIMA = 0.01;

function ratio(part: number | null | undefined, whole: number | null | undefined): number | null {
  if (part == null || whole == null || whole <= 0) return null;
  return part / whole;
}

function sellRatio(buys: number | null | undefined, sells: number | null | undefined): number | null {
  if (buys == null || sells == null) return null;
  const total = buys + sells;
  if (total <= 0) return null;
  return sells / total;
}

function usd(n: number): string {
  if (n >= 1_000_000) return `US$ ${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `US$ ${(n / 1_000).toFixed(0)}K`;
  return `US$ ${Math.round(n)}`;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** Frações minúsculas viram 0% no arredondamento — aqui uma casa importa. */
function pctFine(n: number): string {
  const v = n * 100;
  return `${(v >= 1 ? Math.round(v) : Number(v.toFixed(2))).toString().replace(".", ",")}%`;
}

export const DEX_FRAGILITY_DISCLAIMER =
  "Não é estatística de caminho: o par não tem histórico de candles para precedentes. " +
  "São fatos de liquidez e fluxo do DEX agora — nunca ordem de compra ou venda.";

export function assessDexFragility(input: DexFragilityInput): DexFragilityReport {
  const turnover24h = ratio(input.volume24hUsd, input.liquidityUsd);
  const liqToMcap = ratio(input.liquidityUsd, input.marketCapUsd);
  const sr24 = sellRatio(input.buys24h, input.sells24h);
  const sr6 = sellRatio(input.buys6h, input.sells6h);
  const volumeTrend =
    input.volume1hUsd != null && input.volume6hUsd != null && input.volume6hUsd > 0
      ? (input.volume1hUsd * 6) / input.volume6hUsd
      : null;

  const flags: FragilityFlag[] = [];

  const age = input.pairAgeHours;
  if (age != null && age < NOVO_H) {
    const muitoNovo = age < MUITO_NOVO_H;
    flags.push({
      id: "par_novo",
      label: muitoNovo ? "Par novíssimo" : "Par recente",
      detail: muitoNovo
        ? `Par criado há ~${Math.round(age)}h. Sem histórico para qualquer leitura de precedente.`
        : `Par criado há ~${Math.round(age / 24)}d. Histórico curto demais para precedentes.`,
      severity: muitoNovo ? "alta" : "media",
    });
  }

  const liq = input.liquidityUsd;
  if (liq != null && liq < LIQ_BAIXA) {
    const muitoBaixa = liq < LIQ_MUITO_BAIXA;
    flags.push({
      id: "liquidez_baixa",
      label: muitoBaixa ? "Liquidez mínima" : "Liquidez baixa",
      detail: `Pool com ${usd(liq)}. Uma única saída de tamanho move o preço inteiro.`,
      severity: muitoBaixa ? "alta" : "media",
    });
  }

  if (turnover24h != null && turnover24h >= GIRO_ALTO) {
    const extremo = turnover24h >= GIRO_EXTREMO;
    flags.push({
      id: "giro_extremo",
      label: extremo ? "Giro extremo" : "Giro alto",
      detail: `Volume 24h é ${turnover24h.toFixed(1).replace(".", ",")}× a liquidez do pool — muito dinheiro passando por pouca profundidade.`,
      severity: extremo ? "alta" : "media",
    });
  }

  if (sr24 != null && sr24 >= VENDA_PRESSAO) {
    const forte = sr24 >= VENDA_FORTE;
    const rec = sr6 != null ? ` Em 6h: ${pct(sr6)}.` : "";
    flags.push({
      id: "pressao_venda",
      label: forte ? "Venda dominante" : "Mais venda que compra",
      detail: `${pct(sr24)} das transações de 24h foram vendas.${rec}`,
      severity: forte ? "alta" : "media",
    });
  }

  if (volumeTrend != null && volumeTrend < ESFRIANDO) {
    flags.push({
      id: "volume_esfriando",
      label: "Volume esfriando",
      detail: `A última hora roda ~${pct(volumeTrend)} do ritmo das 6h anteriores.`,
      severity: "media",
    });
  }

  const chg = input.priceChange24hPct;
  if (chg != null && Math.abs(chg) >= PRECO_FINO_PCT && liq != null && liq < LIQ_BAIXA) {
    flags.push({
      id: "preco_fino",
      label: "Preço fino",
      detail: `${chg >= 0 ? "+" : ""}${Math.round(chg)}% em 24h sobre pool de ${usd(liq)} — variação assim exige pouco dinheiro.`,
      severity: "media",
    });
  }

  if (liqToMcap != null && liqToMcap < SAIDA_ESTREITA) {
    const minima = liqToMcap < SAIDA_MINIMA;
    const mcapTxt = input.marketCapUsd != null ? usd(input.marketCapUsd) : "o valor de mercado";
    const liqTxt = liq != null ? usd(liq) : "a pool";
    flags.push({
      id: "saida_estreita",
      label: minima ? "Saída mínima" : "Saída estreita",
      detail: `Pool de ${liqTxt} sustentando ${mcapTxt}: só ${pctFine(liqToMcap)} do valor de papel cabe na liquidez.`,
      severity: minima ? "alta" : "media",
    });
  }

  const altas = flags.filter((f) => f.severity === "alta").length;
  const level: FragilityLevel =
    altas >= 3 ? "extrema" : altas >= 2 ? "alta" : altas === 1 || flags.length >= 2 ? "media" : "observavel";

  return {
    level,
    flags,
    metrics: {
      liquidityUsd: input.liquidityUsd,
      volume24hUsd: input.volume24hUsd,
      turnover24h,
      sellRatio24h: sr24,
      sellRatio6h: sr6,
      volumeTrend,
      pairAgeHours: input.pairAgeHours,
      marketCapUsd: input.marketCapUsd ?? null,
      liqToMcap,
    },
    disclaimer: DEX_FRAGILITY_DISCLAIMER,
  };
}
