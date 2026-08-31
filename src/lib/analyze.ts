import { createServerFn } from "@tanstack/react-start";
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
- Se o print estiver cortado, desfocado ou não for um gráfico, diga isso.
- Responda SOMENTE um JSON válido, sem markdown, neste formato:
{
  "tendencia": "alta" | "baixa" | "lateral" | "indefinida",
  "padrao": string | null,
  "suporte_resistencia": string | null,
  "indicadores_visiveis": string[],
  "timeframe_aparente": string | null,
  "ativo_aparente": string | null,
  "leitura": string,
  "confianca": "alta" | "media" | "baixa"
}
"leitura" tem 2 a 4 frases, factual, em português.`;

function parseVision(text: string): VisionReading {
  const trimmed = text.trim();
  const fenced = trimmed.match(/\{[\s\S]*\}/);
  const raw = fenced ? fenced[0] : trimmed;
  const json = JSON.parse(raw) as Record<string, unknown>;

  const tendenciaRaw = String(json.tendencia ?? "indefinida");
  const tendencia =
    tendenciaRaw === "alta" ||
    tendenciaRaw === "baixa" ||
    tendenciaRaw === "lateral" ||
    tendenciaRaw === "indefinida"
      ? tendenciaRaw
      : "indefinida";

  const confRaw = String(json.confianca ?? "media");
  const confianca = confRaw === "alta" || confRaw === "baixa" ? confRaw : "media";

  return {
    tendencia,
    padrao: json.padrao ? String(json.padrao) : null,
    suporteResistencia: json.suporte_resistencia
      ? String(json.suporte_resistencia)
      : null,
    indicadoresVisiveis: Array.isArray(json.indicadores_visiveis)
      ? json.indicadores_visiveis.map((x) => String(x)).slice(0, 8)
      : [],
    timeframeAparente: json.timeframe_aparente
      ? String(json.timeframe_aparente)
      : null,
    ativoAparente: json.ativo_aparente ? String(json.ativo_aparente) : null,
    leitura: String(json.leitura ?? trimmed).slice(0, 800),
    confianca,
  };
}

async function readChart(imageDataUrl: string): Promise<VisionReading> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("Leitura visual indisponível neste ambiente.");
  }

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(28_000),
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageDataUrl, detail: "high" },
            },
            { type: "text", text: VISION_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Leitura visual falhou (${res.status}).`);
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = body.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("A leitura visual voltou vazia.");
  try {
    return parseVision(text);
  } catch {
    return {
      tendencia: "indefinida",
      padrao: null,
      suporteResistencia: null,
      indicadoresVisiveis: [],
      timeframeAparente: null,
      ativoAparente: null,
      leitura: text.slice(0, 800),
      confianca: "baixa",
    };
  }
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

  const [market, visionPart] = await Promise.all([marketPromise, visionPromise]);

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
  };
}

export const analyzeSetup = createServerFn({ method: "POST" })
  .validator(validateAnalyzeInput)
  .handler(async ({ data }): Promise<AnalysisPayload> => runAnalysis(data));
