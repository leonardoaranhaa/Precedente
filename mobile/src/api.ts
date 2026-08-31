import { ANALYZE_ENDPOINT } from "./config";
import type { AnalysisPayload, ApiErrorBody, Timeframe } from "./types";

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
    throw new Error(
      "Não foi possível conectar ao backend. Confira EXPO_PUBLIC_API_BASE_URL e sua rede.",
    );
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = isErrorBody(body) ? body.error : `Erro do servidor (status ${response.status}).`;
    throw new Error(message);
  }

  return body as AnalysisPayload;
}
