import * as ImageManipulator from "expo-image-manipulator";

const MAX_EDGE = 1280;
const THUMB_SIZE = 160;

function fitWithin(width: number, height: number, maxEdge: number) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function manipulate(uri: string, width: number, height: number, quality: number) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width, height } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  return result.base64 ? `data:image/jpeg;base64,${result.base64}` : null;
}

/**
 * Redimensiona o print escolhido e devolve um data URL JPEG — mesmo formato
 * (`data:image/jpeg;base64,...`) que src/lib/analyze.ts espera no campo
 * `imageDataUrl`.
 */
export async function toAnalysisDataUrl(
  uri: string,
  width: number,
  height: number,
): Promise<string> {
  const target = fitWithin(width, height, MAX_EDGE);
  const dataUrl = await manipulate(uri, target.width, target.height, 0.72);
  if (!dataUrl) throw new Error("Não foi possível processar a imagem.");
  return dataUrl;
}

/** Miniatura leve pra guardar no histórico local. */
export async function toThumbDataUrl(
  uri: string,
  width: number,
  height: number,
): Promise<string | null> {
  try {
    const target = fitWithin(width, height, THUMB_SIZE);
    return await manipulate(uri, target.width, target.height, 0.6);
  } catch {
    return null;
  }
}
