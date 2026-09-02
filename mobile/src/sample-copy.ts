import type { PrecedentResult } from "./types";

export function sampleTitle(note: PrecedentResult["sampleNote"]): string {
  switch (note) {
    case "tiny":
      return "Poucos casos parecidos";
    case "small":
      return "Amostra limitada";
    default:
      return "Amostra razoável";
  }
}

export function sampleBody(note: PrecedentResult["sampleNote"], matches: number): string {
  switch (note) {
    case "tiny":
      return `Só ${matches} ocorrência(s) não sobrepostas com condição parecida neste histórico. Os percentuais e o caminho abaixo são ilustração — não base firme para decisão.`;
    case "small":
      return `${matches} casos parecidos, contados sem sobreposição. Dá para ver o padrão, mas a distribuição ainda é estreita: interprete horizontes e drawdown com cautela.`;
    default:
      return `${matches} casos parecidos no histórico, contados sem sobreposição — cada um separado pelo menos pelo maior horizonte. Suficiente para descrever o que costumava acontecer depois — não para prever o próximo movimento.`;
  }
}

export function productBoundary(): string {
  return "Isto não é previsão, sinal nem ordem de compra ou venda. Só frequência e caminho em condições parecidas.";
}
