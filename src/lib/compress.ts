const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.72;

export async function fileToDataUrl(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  let w = bitmap.width;
  let h = bitmap.height;
  if (w > MAX_EDGE) {
    h = Math.round((h * MAX_EDGE) / w);
    w = MAX_EDGE;
  } else if (h > MAX_EDGE) {
    w = Math.round((w * MAX_EDGE) / h);
    h = MAX_EDGE;
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Não foi possível processar a imagem.");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export async function makeThumb(dataUrl: string, size = 160): Promise<string | null> {
  try {
    const img = await createImageBitmap(await (await fetch(dataUrl)).blob());
    const scale = size / Math.max(img.width, img.height);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      img.close();
      return null;
    }
    ctx.drawImage(img, 0, 0, w, h);
    img.close();
    return canvas.toDataURL("image/jpeg", 0.6);
  } catch {
    return null;
  }
}
