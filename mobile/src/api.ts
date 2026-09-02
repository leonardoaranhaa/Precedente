import { ANALYZE_ENDPOINT, API_BASE_URL } from "./config";
import type { AnalysisPayload, ApiErrorBody, Timeframe, TradedPair } from "./types";

export type AnalyzeRequest = {
  ticker: string;
  timeframe: Timeframe;
  imageDataUrl: string | null;
};

function isErrorBody(x: unknown): x is ApiErrorBody {
  return Boolean(x) && typeof x === "object" && typeof (x as ApiErrorBody).error === "string";
}

export async function analyze(input: AnalyzeRequest): Promise<AnalysisPayload> {
  let response: Response;
  try {
    response = await fetch(ANALYZE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Confira sua conexão.");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = isErrorBody(body) ? body.error : `Erro do servidor (status ${response.status}).`;
    throw new Error(message);
  }

  return body as AnalysisPayload;
}

/**
 * Pares mais negociados nas últimas 24h. Quem chama trata a falha caindo na
 * lista fixa — o ranking é conveniência, não pré-requisito da análise.
 */
export async function fetchTopTraded(limit = 12): Promise<TradedPair[]> {
  const response = await fetch(`${API_BASE_URL}/api/universe?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Não foi possível ler o ranking (status ${response.status}).`);
  }
  const body = (await response.json()) as { pairs?: TradedPair[] };
  return body.pairs ?? [];
}
