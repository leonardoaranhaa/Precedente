import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { displayTicker, normalizeTicker } from "./market/labels";
import { analyzeSeries } from "./market/precedent";
import type { AnalysisPayload, Timeframe, VisionReading } from "./market/types";
import { TIMEFRAMES } from "./market/types";

type AnalyzeInput = {
  ticker: string;
  timeframe: Timeframe;
  imageDataUrl: string | null;
};

const VISION_PROMPT = `Você está lendo um print de gráfico de trading. Descreva APENAS o que é visível.

Regras:
- Nunca recomende comprar, vender, entrar ou sair.
- Não invente preços, indicadores ou padrões que não estejam claramente no print.
- Se o print estiver cortado, desfocado ou não for um gráfico, diga isso em "leitura" e use confiança "baixa".
- Campos sem informação clara no print ficam null (ou lista vazia).
- "leitura" tem 2 a 4 frases, factual, em português.`;

const VisionSchema = z.object({
  tendencia: z.enum(["alta", "baixa", "lateral", "indefinida"]),
  padrao: z.string().nullable(),
  suporte_resistencia: z.string().nullable(),
  indicadores_visiveis: z.array(z.string()),
  timeframe_aparente: z.string().nullable(),
  ativo_aparente: z.string().nullable(),
  leitura: z.string(),
  confianca: z.enum(["alta", "media", "baixa"]),
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

async function readChart(imageDataUrl: string): Promise<VisionReading> {
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
    response = await client.messages.parse({
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
    });
  } catch (err) {
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
    tendencia: parsed.tendencia,
    padrao: parsed.padrao,
    suporteResistencia: parsed.suporte_resistencia,
    indicadoresVisiveis: parsed.indicadores_visiveis.map((x) => String(x)).slice(0, 8),
    timeframeAparente: parsed.timeframe_aparente,
    ativoAparente: parsed.ativo_aparente,
    leitura: parsed.leitura.slice(0, 800),
    confianca: parsed.confianca,
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
  const { fetchOHLCV } = await import("./market/exchange");
  const { fetchOnchainContext } = await import("./market/onchain");

  const marketPromise = fetchOHLCV(data.ticker, data.timeframe).then((m) => ({
    ...m,
    stats: analyzeSeries(m.candles, data.timeframe),
  }));

  const visionPromise = data.imageDataUrl
    ? readChart(data.imageDataUrl)
        .then((vision) => ({ vision, visionError: null as string | null }))
        .catch((err: unknown) => ({
          vision: null,
          visionError:
            err instanceof Error
              ? err.message
              : "Não foi possível ler o print.",
        }))
    : Promise.resolve({ vision: null, visionError: null });

  const onchainPromise = fetchOnchainContext(data.ticker).catch(() => null);

  const [market, visionPart, onchain] = await Promise.all([
    marketPromise,
    visionPromise,
    onchainPromise,
  ]);

  const hasOnchain =
    onchain &&
    (onchain.fundingRate != null ||
      onchain.openInterest != null ||
      onchain.liquidityUsd != null ||
      onchain.volume24hUsd != null);

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
    source: market.source,
    onchain: hasOnchain ? onchain : null,
  };
}

export const analyzeSetup = createServerFn({ method: "POST" })
  .validator(validateAnalyzeInput)
  .handler(async ({ data }): Promise<AnalysisPayload> => runAnalysis(data));
