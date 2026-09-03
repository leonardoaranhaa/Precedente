import { checkRateLimit, RateLimitError } from "./rate-limit.ts";

/**
 * Cada chamada custa uma request paga (Sonnet + até N buscas web reais) —
 * bem mais caro que a análise OHLC comum. Limite por usuário (não por IP,
 * já que a rota exige login) e uma janela mais larga que a de análise, pra
 * combinar com o caráter "consulta pontual" do recurso, não "loop de tela".
 */
export const EXTERNAL_INTEL_LIMIT = 15;
export const EXTERNAL_INTEL_WINDOW_MS = 60 * 60 * 1000;

export function externalIntelBucketKey(userId: string): string {
  return `external-intel:${userId}`;
}

/** Dispara `RateLimitError` quando a cota deste recurso premium acaba para o usuário. */
export function assertExternalIntelQuota(userId: string): void {
  const result = checkRateLimit(
    externalIntelBucketKey(userId),
    EXTERNAL_INTEL_LIMIT,
    EXTERNAL_INTEL_WINDOW_MS,
  );
  if (!result.allowed) {
    throw new RateLimitError("Muitas consultas de inteligência externa em pouco tempo. Tente de novo em instantes.");
  }
}
