// Preço do Claude Opus 5 (leitura de print).
// $5 / 1M tokens de entrada, $25 / 1M de saída.
const OPUS5_INPUT_PER_TOKEN = 5 / 1_000_000;
const OPUS5_OUTPUT_PER_TOKEN = 25 / 1_000_000;

export function opus5CostUsd(usage: {
  input_tokens?: number | null;
  output_tokens?: number | null;
}): number {
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  return input * OPUS5_INPUT_PER_TOKEN + output * OPUS5_OUTPUT_PER_TOKEN;
}

// Preço do Claude Sonnet 5 (agente de inteligência externa — protótipo).
// $2 / 1M tokens de entrada, $10 / 1M de saída. Fonte: platform.claude.com/docs/en/about-claude/pricing (checado em 2026-09-02).
const SONNET5_INPUT_PER_TOKEN = 2 / 1_000_000;
const SONNET5_OUTPUT_PER_TOKEN = 10 / 1_000_000;

export function sonnet5CostUsd(usage: {
  input_tokens?: number | null;
  output_tokens?: number | null;
}): number {
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  return input * SONNET5_INPUT_PER_TOKEN + output * SONNET5_OUTPUT_PER_TOKEN;
}

// Busca web (server tool): $10 por 1.000 buscas, além do custo de tokens acima.
const WEB_SEARCH_COST_PER_USE = 10 / 1_000;

export function webSearchCostUsd(searchCount: number): number {
  return Math.max(0, searchCount) * WEB_SEARCH_COST_PER_USE;
}
