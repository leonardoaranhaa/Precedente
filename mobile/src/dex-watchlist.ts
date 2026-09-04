/**
 * Lista de tickers DEX pinados pro alerta de drenagem.
 *
 * Separada da Watch de propósito — mesma decisão do backend
 * (docs/dex-arquitetura.md): um token DEX não tem timeframe nem candle,
 * então misturar com WatchItem (que exige os dois) forçaria dado falso.
 * São ativos de natureza diferente: alta rotatividade, sem histórico de
 * precedente, cap bem menor.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DexFragilityReport, DexPairSnapshot } from "./types";

const KEY = "precedente.dex-watch.v1";
/** Mesmo cap do backend (push/types.ts MAX_DEX_WATCHES) — tokens de ciclo
 * curto têm alta rotatividade, uma lista grande de moedas já mortas não
 * ajuda ninguém. */
export const MAX_DEX_WATCHES = 12;

export type DexWatchItem = {
  ticker: string;
  pinnedAt: number;
  /** Snapshot da última leitura — pra pintar a linha sem esperar um novo fetch. */
  tokenName: string | null;
  level: DexFragilityReport["level"];
  liquidityUsd: number | null;
  priceUsd: number | null;
  updatedAt: number;
};

export function dexItemFromReading(
  ticker: string,
  pair: DexPairSnapshot,
  fragility: DexFragilityReport,
): DexWatchItem {
  return {
    ticker,
    pinnedAt: Date.now(),
    tokenName: pair.tokenName,
    level: fragility.level,
    liquidityUsd: pair.liquidityUsd,
    priceUsd: pair.priceUsd,
    updatedAt: Date.now(),
  };
}

export async function loadDexWatchlist(): Promise<DexWatchItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DexWatchItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveDexWatchlist(items: DexWatchItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_DEX_WATCHES)));
  } catch {
    /* quota */
  }
}

export function isDexWatched(current: DexWatchItem[], ticker: string): boolean {
  const t = ticker.toUpperCase();
  return current.some((w) => w.ticker === t);
}

/** Adiciona (ou atualiza o snapshot de) um ticker. Idempotente. */
export async function pinDexWatch(
  current: DexWatchItem[],
  item: DexWatchItem,
): Promise<DexWatchItem[]> {
  const items = [item, ...current.filter((w) => w.ticker !== item.ticker)].slice(
    0,
    MAX_DEX_WATCHES,
  );
  await saveDexWatchlist(items);
  return items;
}

export async function unpinDexWatch(
  current: DexWatchItem[],
  ticker: string,
): Promise<DexWatchItem[]> {
  const t = ticker.toUpperCase();
  const items = current.filter((w) => w.ticker !== t);
  await saveDexWatchlist(items);
  return items;
}
