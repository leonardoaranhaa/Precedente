import Anthropic from "@anthropic-ai/sdk";
import { CircuitOpenError, withCircuitBreaker } from "../circuit-breaker.ts";
import { sonnet5CostUsd, webSearchCostUsd } from "../anthropic-cost.ts";
import { displayTicker, normalizeTicker } from "./labels.ts";

/**
 * PROTÓTIPO — não é chamado por nenhuma tela nem pelo motor de análise
 * ainda. Ver PR de origem para o pitch: um agente separado, com acesso à
 * web (busca real, via server tool da Anthropic), que traz contexto de
 * notícia/mercado cripto pra alimentar o assistente — sem misturar isso
 * com a leitura de gráfico (`analyze.ts`), que é 100% dados OHLC/on-chain
 * e não sai da própria conta da Binance/DexScreener.
 *
 * Por que um módulo à parte, e não mais uma chamada dentro de `analyze.ts`:
 * - Custo bem maior (Sonnet + até N buscas reais, ~$0,01 cada) — é
 *   explicitamente um recurso pago, não algo que deveria rodar em toda
 *   análise gratuita.
 * - Falha de busca externa não pode derrubar a análise técnica, que hoje
 *   nunca depende de rede além de Binance/DexScreener/Anthropic-vision.
 * - Fica fácil ligar/desligar (feature flag + `hasPremium`) sem tocar no
 *   caminho crítico já validado.
 */

export type ExternalIntelSource = {
  url: string;
  title: string;
};

export type ExternalIntelResult = {
  ticker: string;
  displayTicker: string;
  /** Resumo em português, gerado pelo modelo a partir dos resultados de busca. */
  summary: string;
  sources: ExternalIntelSource[];
  /** Nº de buscas web reais que o modelo disparou para responder. */
  searchCount: number;
  costUsd: number;
  fetchedAt: number;
};

const MAX_SEARCHES = 4;
const MAX_SOURCES = 6;

function systemPrompt(): string {
  return `Você é um agente de contexto — não um consultor de investimentos.

Sua única função: usar a busca web para trazer o que há de mais recente e
factual sobre um ativo de cripto/mercado financeiro (notícias, eventos
regulatórios, movimentações relevantes, anúncios de exchange, dados
macro que afetem o ativo) e devolver um resumo curto e neutro.

Regras rígidas:
- Nunca recomende comprar, vender, entrar ou sair de uma posição.
- Nunca dê alvo de preço, previsão de direção, ou "sinal".
- Cite só o que encontrar nas buscas — não complete com conhecimento
  prévio não verificado nem invente eventos.
- Se a busca não trouxer nada relevante e recente, diga isso claramente
  em vez de forçar um resumo.
- Priorize fontes reconhecidas (agências de notícia, veículos
  especializados, comunicados oficiais de exchange/projeto) sobre posts
  de rede social sem verificação.
- Resposta final: 3 a 6 frases, em português, só texto corrido (sem
  listas, sem markdown), terminando sempre com um lembrete de que isto é
  contexto informativo, não recomendação.`;
}

function userPrompt(ticker: string): string {
  return (
    `Busque as notícias e movimentações de mercado mais recentes e relevantes ` +
    `sobre ${ticker} (cripto). Cubra, se houver: notícias regulatórias, ` +
    `eventos on-chain relevantes, anúncios de exchanges, contexto macro que ` +
    `afete o ativo. Responda com o resumo em português conforme as regras.`
  );
}

function extractSources(content: Anthropic.Messages.ContentBlock[]): ExternalIntelSource[] {
  const seen = new Set<string>();
  const sources: ExternalIntelSource[] = [];
  for (const block of content) {
    if (block.type !== "web_search_tool_result") continue;
    if (!Array.isArray(block.content)) continue; // erro de busca (WebSearchToolResultError)
    for (const result of block.content) {
      if (seen.has(result.url)) continue;
      seen.add(result.url);
      sources.push({ url: result.url, title: result.title || result.url });
      if (sources.length >= MAX_SOURCES) return sources;
    }
  }
  return sources;
}

/**
 * Achado do teste de campo: entre buscas, o modelo às vezes narra o próprio
 * raciocínio em blocos de texto soltos ("Tenho material suficiente pra
 * elaborar um resumo...") antes da síntese final — se juntássemos todo
 * bloco de texto, esse "pensar alto" vazava pro resumo entregue ao usuário.
 * Em vez disso, pega só os blocos de texto depois do último bloco de
 * ferramenta — a síntese final de verdade, sem a narração do meio do
 * caminho.
 */
function extractSummary(content: Anthropic.Messages.ContentBlock[]): string {
  let lastToolIndex = -1;
  content.forEach((b, i) => {
    if (b.type !== "text") lastToolIndex = i;
  });
  return content
    .slice(lastToolIndex + 1)
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Parsing puro (sem rede) — separado pra dar pra testar sem chamar a API de verdade. */
export function parseExternalIntelResponse(
  content: Anthropic.Messages.ContentBlock[],
  usage: { input_tokens?: number | null; output_tokens?: number | null },
): { summary: string; sources: ExternalIntelSource[]; searchCount: number; costUsd: number } {
  const searchCount = content.filter((b) => b.type === "web_search_tool_result").length;
  return {
    summary: extractSummary(content),
    sources: extractSources(content),
    searchCount,
    costUsd: sonnet5CostUsd(usage) + webSearchCostUsd(searchCount),
  };
}

export function validateIntelTicker(raw: unknown): string {
  const ticker = normalizeTicker(String(raw ?? ""));
  if (!/^[A-Z0-9]{2,20}$/.test(ticker)) {
    throw new Error("Ticker inválido para busca externa.");
  }
  return ticker;
}

/**
 * Chama Claude com a server tool de busca web ligada. Sem loop manual: a
 * busca roda do lado da Anthropic, então uma única `messages.create` já
 * volta com o resumo final na maioria dos casos. Em teoria uma busca muito
 * longa pode voltar com `stop_reason: "pause_turn"` — tratamos isso como
 * resposta parcial (não é erro) em vez de tentar retomar o turno, porque
 * este é um resumo curto por natureza, não uma tarefa longa de agente.
 */
export async function fetchExternalIntel(rawTicker: string): Promise<ExternalIntelResult> {
  const ticker = validateIntelTicker(rawTicker);

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Inteligência externa indisponível neste ambiente.");
  }

  // Até MAX_SEARCHES buscas sequenciais reais (cada uma com raciocínio do
  // modelo entre elas) — no teste de campo, uma única chamada com 4 buscas
  // levou ~60-90s. 45s cortava a resposta no meio; achado real, registrado
  // no PR, não só um número arbitrário.
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  const client = new Anthropic({
    timeout: 120_000,
    ...(workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : {}),
  });

  let response: Anthropic.Messages.Message;
  try {
    response = await withCircuitBreaker(
      "Notícias de mercado",
      { failureThreshold: 5, cooldownMs: 30_000 },
      () =>
        client.messages.create({
          model: "claude-sonnet-5",
          max_tokens: 2000,
          system: systemPrompt(),
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES }],
          messages: [{ role: "user", content: userPrompt(ticker) }],
        }),
    );
  } catch (err) {
    if (err instanceof CircuitOpenError) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error("Chave da inteligência externa inválida.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new Error("Inteligência externa ocupada agora. Tente de novo em instantes.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`Inteligência externa falhou (${err.status}).`);
    }
    throw new Error("Não foi possível buscar contexto externo agora.");
  }

  if (response.stop_reason === "refusal") {
    throw new Error("A busca de contexto externo foi recusada para este ativo.");
  }

  const parsed = parseExternalIntelResponse(response.content, response.usage);
  if (!parsed.summary) {
    throw new Error("A busca de contexto externo não voltou com um resumo.");
  }

  return {
    ticker,
    displayTicker: displayTicker(ticker),
    summary: parsed.summary.slice(0, 2000),
    sources: parsed.sources,
    searchCount: parsed.searchCount,
    costUsd: parsed.costUsd,
    fetchedAt: Date.now(),
  };
}
