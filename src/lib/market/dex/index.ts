/**
 * CAMADA 3 — COMPOSIÇÃO. Fachada do subsistema DEX.
 *
 * É o ÚNICO ponto de entrada para quem está fora de dex/. Rotas e outros
 * módulos chegam aqui por import() dinâmico; daqui pra dentro tudo é
 * estático. Essa uniformidade é o que evita a colisão de chunk do Rolldown
 * que já derrubou produção duas vezes — ver docs/dex-arquitetura.md.
 */

import { fetchDexPair } from "./fetch";
import { assessDexFragility, type DexFragilityInput, type DexFragilityReport } from "./fragility";
import type { DexPairSnapshot } from "./types";

export { fetchDexPair } from "./fetch";
export { assessDexFragility, DEX_FRAGILITY_DISCLAIMER } from "./fragility";
export type {
  DexFragilityInput,
  DexFragilityReport,
  FragilityFlag,
  FragilityFlagId,
  FragilityLevel,
} from "./fragility";
export type { DexPairSnapshot, DexWindow, DexSocial } from "./types";

/**
 * Adaptador dados → domínio. Mora aqui, na composição, para que a camada
 * de domínio siga sem conhecer o formato do fio: `assessDexFragility` aceita
 * uma entrada estrutural, então `OnchainContext` também serve sem adaptador.
 */
export function toFragilityInput(snap: DexPairSnapshot): DexFragilityInput {
  return {
    liquidityUsd: snap.liquidityUsd,
    volume24hUsd: snap.h24.volumeUsd,
    volume6hUsd: snap.h6.volumeUsd,
    volume1hUsd: snap.h1.volumeUsd,
    buys24h: snap.h24.buys,
    sells24h: snap.h24.sells,
    buys6h: snap.h6.buys,
    sells6h: snap.h6.sells,
    priceChange24hPct: snap.h24.priceChangePct,
    pairAgeHours: snap.pairAgeHours,
    marketCapUsd: snap.marketCapUsd,
  };
}

export type DexPairReading = {
  pair: DexPairSnapshot;
  fragility: DexFragilityReport;
};

/** Busca o par e devolve já com a leitura. Null quando o token não tem par. */
export async function readDexPair(symbol: string): Promise<DexPairReading | null> {
  const pair = await fetchDexPair(symbol);
  if (!pair) return null;
  return { pair, fragility: assessDexFragility(toFragilityInput(pair)) };
}
