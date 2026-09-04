import type { PatternRegion } from "./market/types";

/**
 * Descarta a região se vier fora dos limites da imagem (0..1) ou degenerada
 * (largura/altura zero ou negativa). O schema de saída do modelo já valida
 * cada número isoladamente (0..1) — isso cobre o que ele não cobre: x+width
 * ou y+height ainda cabendo na imagem.
 */
export function sanePatternRegion(r: PatternRegion | null): PatternRegion | null {
  if (!r) return null;
  if (r.width <= 0 || r.height <= 0) return null;
  if (r.x + r.width > 1.01 || r.y + r.height > 1.01) return null;
  return r;
}
