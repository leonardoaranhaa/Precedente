// Preço do Claude Opus 5 (a única chamada paga do produto — leitura de print).
// $5 / 1M tokens de entrada, $25 / 1M de saída.
const INPUT_PER_TOKEN = 5 / 1_000_000;
const OUTPUT_PER_TOKEN = 25 / 1_000_000;

export function opus5CostUsd(usage: {
  input_tokens?: number | null;
  output_tokens?: number | null;
}): number {
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  return input * INPUT_PER_TOKEN + output * OUTPUT_PER_TOKEN;
}
