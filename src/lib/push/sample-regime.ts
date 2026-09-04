/**
 * Regime de amostra — rastreia transição ok → small → tiny (e recuperação).
 * Estado anterior vive em lastSent sob chave dedicada (número = código do regime).
 * Só fatos: tamanho da amostra / nota do precedente. Sem coaching.
 */

export type SampleNote = "ok" | "small" | "tiny";

/** Códigos crescentes = amostra mais frágil. */
export function sampleNoteCode(note: SampleNote): number {
  if (note === "tiny") return 3;
  if (note === "small") return 2;
  return 1;
}

export function sampleNoteFromCode(code: number): SampleNote {
  if (code >= 3) return "tiny";
  if (code >= 2) return "small";
  return "ok";
}

export function regimeStateKey(ticker: string, timeframe: string): string {
  return `${ticker}:${timeframe}:_sample_regime`;
}

export type RegimeTransition = {
  from: SampleNote;
  to: SampleNote;
  worsened: boolean;
  recovered: boolean;
};

export function detectRegimeTransition(
  prevCode: number | undefined,
  current: SampleNote,
): RegimeTransition | null {
  if (prevCode == null || prevCode <= 0) {
    return null;
  }
  const from = sampleNoteFromCode(prevCode);
  const to = current;
  if (from === to) return null;
  const worsened = sampleNoteCode(to) > sampleNoteCode(from);
  const recovered = sampleNoteCode(to) < sampleNoteCode(from);
  return { from, to, worsened, recovered };
}

export function regimeBody(t: RegimeTransition, matches: number): string {
  if (t.worsened) {
    if (t.to === "tiny") {
      return `Amostra passou de ${t.from} para tiny (n=${matches}). Distribuição do caminho vira ilustração — não base de decisão.`;
    }
    return `Amostra passou de ${t.from} para ${t.to} (n=${matches}). Interprete horizontes e drawdown com mais cautela.`;
  }
  if (t.to === "ok") {
    return `Amostra voltou a ok (n=${matches}) após ${t.from}. Regime estatístico mais estável neste TF.`;
  }
  return `Amostra saiu de ${t.from} para ${t.to} (n=${matches}). Ainda não é ok — mantenha leitura cautelosa.`;
}

export function regimeTitle(displayTicker: string, t: RegimeTransition): string {
  if (t.worsened) return `${displayTicker} · regime de amostra piorou (${t.from}→${t.to})`;
  return `${displayTicker} · regime de amostra melhorou (${t.from}→${t.to})`;
}
