import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CircuitOpenError, withCircuitBreaker } from "./circuit-breaker";
import { displayTicker, normalizeTicker } from "./market/labels";
import { analyzeSeries } from "./market/precedent";
import type { AnalysisPayload, Timeframe, VisionReading } from "./market/types";
import { TIMEFRAMES } from "./market/types";
import { opus5CostUsd } from "./anthropic-cost";
import { billingGatesEnabled, PremiumRequiredError } from "./billing/plan-limits";
import { sanePatternRegion } from "./pattern-region";

type AnalyzeInput = {
  ticker: string;
  timeframe: Timeframe;
  imageDataUrl: string | null;
};

const VISION_PROMPT = `Você está lendo um print de gráfico de trading. Descreva APENAS o que é visível.\n\nRegras:\n- Nunca recomende comprar, vender, entrar ou sair.\n- Não invente preços, indicadores ou padrões que não estejam claramente no print.\n- Se o print estiver cortado, desfocado ou não for um gráfico, diga isso em "leitura" e use confiança "baixa".\n- Campos sem informação clara no print ficam null (ou lista vazia).\n- "leitura" tem 2 a 4 frases, factual, em português.\n- Se "padrao" não for null, preencha "regiao_padrao" com a caixa aproximada (em frações de 0 a 1\n  da largura/altura da imagem, origem no canto superior esquerdo) de ONDE nesse print o padrão\n  aparece. Só preencha se você conseguir apontar a região com razoável confiança visual — do\n  contrário deixe null. Nunca invente uma região só para preencher o campo.`;

const PatternRegionSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

const VisionSchema = z.object({
  tendencia: z.enum(["alta", "baixa", "lateral", "indefinida"]),
  padrao: z.string().nullable(),
  suporte_resistencia: z.string().nullable(),
  indicadores_visiveis: z.array(z.string()),
  timeframe_aparente: z.string().nullable(),
  ativo_aparente: z.string().nullable(),
  leitura: z.string(),
  confianca: z.enum(["alta", "media", "baixa"]),
  regiao_padrao: PatternRegionSchema.nullable(),
});

const SUPPORTED_MEDIA = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedMedia = (typeof SUPPORTED_MEDIA)[number];

function splitDataUrl(dataUrl: string): { mediaType: SupportedMedia; data: string } {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
  const mediaType = match?.[1];
  const data = match?.[2];
  if (!mediaType || !data) {
    throw new Error("Não foi possível ler esse print.");
  }
  if (!SUPPORTED_MEDIA.includes(mediaType as SupportedMedia)) {
    throw new Error("Formato de imagem não suportado na leitura visual.");
  }
  return { mediaType: mediaType as SupportedMedia, data };
}

async function readChart(
  imageDataUrl: string,
): Promise<{ reading: VisionReading; costUsd: number }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Leitura visual indisponível neste ambiente.");
  }

  const { mediaType, data } = splitDataUrl(imageDataUrl);

  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  const client = new Anthropic({
    timeout: 28_000,
    ...(workspaceId
      ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } }
      : {}),
  });

  let response;
  try {
    response = await withCircuitBreaker(
      "Leitura visual",
      { failureThreshold: 5, cooldownMs: 30_000 },
      () =>
        client.messages.parse({
          model: "claude-opus-5",
          max_tokens: 16000,
          output_config: {
            effort: "low",
            format: zodOutputFormat(VisionSchema),
          },
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: mediaType, data } },
                { type: "text", text: VISION_PROMPT },
              ],
            },
          ],
        }),
    );
  } catch (err) {
    if (err instanceof CircuitOpenError) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error("Chave da leitura visual inválida.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new Error("Leitura visual ocupada agora. Tente de novo em instantes.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`Leitura visual falhou (${err.status}).`);
    }
    throw new Error("Não foi possível ler o print.");
  }

  if (response.stop_reason === "refusal") {
    throw new Error("A leitura visual foi recusada para este print.");
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("A leitura visual voltou vazia.");
  }

  return {
    reading: {
      tendencia: parsed.tendencia,
      padrao: parsed.padrao,
      suporteResistencia: parsed.suporte_resistencia,
      indicadoresVisiveis: parsed.indicadores_visiveis.map((x) => String(x)).slice(0, 8),
      timeframeAparente: parsed.timeframe_aparente,
      ativoAparente: parsed.ativo_aparente,
      leitura: parsed.leitura.slice(0, 800),
      confianca: parsed.confianca,
      patternRegion: sanePatternRegion(parsed.regiao_padrao),
    },
    costUsd: opus5CostUsd(response.usage),
  };
}

export function validateAnalyzeInput(input: unknown): AnalyzeInput {
  if (!input || typeof input !== "object") {
    throw new Error("Pedido inválido.");
  }
  const raw = input as Partial<AnalyzeInput>;
  const ticker = normalizeTicker(String(raw.ticker ?? ""));
  if (!/^[A-Z0-9]{5,20}$/.test(ticker)) {
    throw new Error("Ticker inválido. Ex.: BTC, ETHUSDT, SOL.");
  }
  const timeframe = raw.timeframe as Timeframe;
  if (!TIMEFRAMES.includes(timeframe)) {
    throw new Error("Tempo gráfico inválido.");
  }
  const imageDataUrl =
    typeof raw.imageDataUrl === "string" && raw.imageDataUrl.startsWith("data:image/")
      ? raw.imageDataUrl
      : null;
  if (imageDataUrl && imageDataUrl.length > 1_800_000) {
    throw new Error("Print grande demais. Envie um recorte do gráfico.");
  }
  return { ticker, timeframe, imageDataUrl };
}

export async function runAnalysis(data: AnalyzeInput): Promise<AnalysisPayload> {
  const { assertAnalyzeRateLimit } = await import("./analyze-rate-limit.server");
  assertAnalyzeRateLimit(data.imageDataUrl != null);

  // ⚠️ Disciplina de imports neste arquivo — não mexa sem ler:
  // analyze.ts é alcançável do bundle do cliente (via routes/index.tsx). Quando
  // o MESMO módulo é importado estático num lugar e dinâmico noutro cruzando a
  // fronteira cliente/servidor, o Rolldown gera um chunk corrompido e o servidor
  // compilado morre com "SyntaxError: Export 'ssr_exports' is not defined" —
  // invisível a tsc, lint e até `vite build`, que só verifica que compila.
  // Já derrubou produção duas vezes (2026-09-03/04: market/onchain importado
  // estaticamente em push/funding-digest-scan.ts, billing/vision-quota em
  // routes/api/billing/vision-status.ts).
  // Regra: módulo server-only (DB, estado do processo) fica DINÂMICO aqui E em
  // todo o resto do código — nunca estático noutro arquivo. Antes de trocar um
  // import de dinâmico pra estático (ou vice-versa), faça grep do caminho do
  // módulo em todo src/ e confirme que não existe o outro jeito em lugar nenhum.
  // billingGatesEnabled/PremiumRequiredError vêm de plan-limits.ts por import
  // ESTÁTICO de propósito: módulo puro, já importado estaticamente em rotas e
  // componentes, então tem que continuar estático em todo lugar.
  let visionQuota: AnalysisPayload["visionQuota"] = null;
  if (data.imageDataUrl) {
    const { getSessionUser } = await import("./auth/verify.server");
    const session = await getSessionUser();
    if (!session?.id) {
      throw new PremiumRequiredError(
        "vision",
        "Entre na sua conta para usar a leitura de print. No plano gratuito há cota diária limitada; Premium amplia essa cota. Não é recomendação de compra ou venda.",
      );
    }
    if (billingGatesEnabled()) {
      const { assertPremiumFeatureForUser } = await import("./billing/assert-premium.server");
      const {
        getVisionCountToday,
        incrementVisionCount,
        getVisionQuotaSnapshot,
      } = await import("./billing/vision-quota");
      const { isPremium } = await assertPremiumFeatureForUser(session.id, "vision", {
        visionCountToday: getVisionCountToday(session.id),
      });
      incrementVisionCount(session.id);
      visionQuota = getVisionQuotaSnapshot(session.id, isPremium);
      if (visionQuota.nearLimit) {
        void import("./push/vision-quota-alert")
          .then(({ maybeNotifyVisionQuota }) =>
            maybeNotifyVisionQuota(session.id, visionQuota!),
          )
          .catch(() => {});
      }
    }
  }

  const startedAt = Date.now();
  const { fetchOHLCV } = await import("./market/exchange");
  const { fetchOnchainContext, summarizeDexForError } = await import("./market/onchain");

  const onchainPromise = fetchOnchainContext(data.ticker).catch(() => null);

  const newsPromise = import("./news/context-for-ticker")
    .then(({ buildNewsContextForTicker }) => buildNewsContextForTicker(data.ticker))
    .catch(() => null);

  let market: Awaited<ReturnType<typeof fetchOHLCV>> & {
    stats: ReturnType<typeof analyzeSeries>;
  };

  try {
    const m = await fetchOHLCV(data.ticker, data.timeframe);
    market = { ...m, stats: analyzeSeries(m.candles, data.timeframe) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const notListed =
      msg.includes("não encontrado") || msg.includes("Sem candles");
    if (notListed) {
      const onchain = await onchainPromise;
      const dexHint = onchain ? summarizeDexForError(onchain) : null;
      if (dexHint) {
        throw new Error(
          `${msg} No DEX há atividade (${dexHint}). Precedentes de preço exigem histórico de candles na Binance — use o contexto de liquidez só como fragilidade pré-listagem, não como estatística de caminho.`,
        );
      }
    }
    throw err instanceof Error ? err : new Error(msg);
  }

  const visionPromise = data.imageDataUrl
    ? readChart(data.imageDataUrl)
        .then(({ reading, costUsd }) => ({
          vision: reading,
          visionError: null as string | null,
          visionCostUsd: costUsd,
        }))
        .catch((err: unknown) => ({
          vision: null,
          visionError:
            err instanceof Error
              ? err.message
              : "Não foi possível ler o print.",
          visionCostUsd: 0,
        }))
    : Promise.resolve({ vision: null, visionError: null, visionCostUsd: 0 });

  const [visionPart, onchain, newsContext] = await Promise.all([
    visionPromise,
    onchainPromise,
    newsPromise,
  ]);

  const { logAnalysis } = await import("./analyze-log");
  logAnalysis({
    ticker: data.ticker,
    timeframe: data.timeframe,
    hasImage: data.imageDataUrl != null,
    durationMs: Date.now() - startedAt,
    matches: market.stats.precedent.matches,
    sampleNote: market.stats.precedent.sampleNote,
    relaxed: market.stats.precedent.relaxed.length > 0,
    source: market.source,
    visionCostUsd: visionPart.visionCostUsd,
  });

  return {
    ticker: data.ticker,
    displayTicker: displayTicker(data.ticker),
    timeframe: data.timeframe,
    fetchedAt: Date.now(),
    candleCount: market.candles.length,
    snapshot: market.stats.snapshot,
    precedent: market.stats.precedent,
    chart: market.stats.chart,
    vision: visionPart.vision,
    visionError: visionPart.visionError,
    visionQuota,
    source: market.source,
    onchain,
    newsContext,
  };
}

export const analyzeSetup = createServerFn({ method: "POST" })
  .validator(validateAnalyzeInput)
  .handler(async ({ data }): Promise<AnalysisPayload> => runAnalysis(data));
