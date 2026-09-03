/**
 * Contador honesto de "riscos sinalizados" — quantas vezes o app avisou de
 * amostra fraca ou drawdown de caminho elevado numa análise que o usuário
 * abriu. Não é lucro gerado, é a prova de que o app avisou antes da decisão
 * (ver plano de produto "Por Que Pagar" — princípio "prova de valor, não
 * promessa"). Local, por dispositivo — mesmo padrão do watchlist.ts.
 */
const KEY = "precedente.risklog.v1";
const MAX_SEEN = 200;

export type RiskLog = {
  sampleWeak: number;
  drawdownHigh: number;
  since: number;
  /** Ids de análise já contabilizados — evita contar de novo ao reabrir o mesmo resultado. */
  seenIds: string[];
};

function empty(): RiskLog {
  return { sampleWeak: 0, drawdownHigh: 0, since: Date.now(), seenIds: [] };
}

function load(): RiskLog {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<RiskLog>;
    return {
      sampleWeak: typeof parsed.sampleWeak === "number" ? parsed.sampleWeak : 0,
      drawdownHigh: typeof parsed.drawdownHigh === "number" ? parsed.drawdownHigh : 0,
      since: typeof parsed.since === "number" ? parsed.since : Date.now(),
      seenIds: Array.isArray(parsed.seenIds) ? parsed.seenIds : [],
    };
  } catch {
    return empty();
  }
}

function save(log: RiskLog) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    /* quota */
  }
}

export function getRiskLog(): RiskLog {
  return load();
}

/** Registra os riscos de uma análise, uma única vez por id. */
export function recordRiskEvents(
  analysisId: string,
  flags: { sampleWeak: boolean; drawdownHigh: boolean },
): RiskLog {
  const log = load();
  if (log.seenIds.includes(analysisId)) return log;
  if (flags.sampleWeak) log.sampleWeak += 1;
  if (flags.drawdownHigh) log.drawdownHigh += 1;
  if (flags.sampleWeak || flags.drawdownHigh) {
    log.seenIds = [...log.seenIds, analysisId].slice(-MAX_SEEN);
    save(log);
  }
  return log;
}
