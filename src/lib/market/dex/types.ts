/**
 * CAMADA 1 — DADOS. Tipos do par no DEX.
 *
 * `DexScreenerPair` é o formato do fio (o JSON que a API devolve, com todos
 * os campos opcionais porque não controlamos o contrato). `DexPairSnapshot` é
 * o nosso formato normalizado: nomes explícitos, unidade no nome, `null` em
 * vez de `undefined`, e janelas de tempo como estrutura uniforme.
 *
 * Só a camada 1 conhece `DexScreenerPair`. Domínio e UI falam `DexPairSnapshot`.
 */

/** Uma janela de tempo do par (5m, 1h, 6h, 24h). */
export type DexWindow = {
  buys: number | null;
  sells: number | null;
  volumeUsd: number | null;
  priceChangePct: number | null;
};

export type DexSocial = { type: string; url: string };

export type DexPairSnapshot = {
  // --- identidade ---
  chainId: string | null;
  dexId: string | null;
  /** Rótulos de versão do protocolo, ex.: ["v4"]. */
  labels: string[];
  pairAddress: string | null;
  pairUrl: string | null;
  tokenSymbol: string | null;
  /** Nome legível, ex.: "legs.fun". Vira o subtítulo na lista. */
  tokenName: string | null;
  tokenAddress: string | null;
  quoteSymbol: string | null;

  // --- apresentação ---
  imageUrl: string | null;
  headerUrl: string | null;
  websites: string[];
  socials: DexSocial[];
  /** Impulsionamento pago no DexScreener. Sinal de promoção, não de qualidade. */
  boostsActive: number | null;

  // --- estado ---
  priceUsd: number | null;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  pairAgeHours: number | null;

  // --- janelas ---
  m5: DexWindow;
  h1: DexWindow;
  h6: DexWindow;
  h24: DexWindow;

  fetchedAt: number;
  source: string;
};

/** Formato do fio. Tudo opcional de propósito: não controlamos o contrato. */
export type DexScreenerPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  labels?: string[];
  pairAddress?: string;
  pairCreatedAt?: number;
  baseToken?: { symbol?: string; name?: string; address?: string };
  quoteToken?: { symbol?: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { m5?: number; h1?: number; h6?: number; h24?: number };
  txns?: Partial<
    Record<"m5" | "h1" | "h6" | "h24", { buys?: number; sells?: number }>
  >;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  fdv?: number;
  marketCap?: number;
  info?: {
    imageUrl?: string;
    header?: string;
    websites?: { url?: string; label?: string }[];
    socials?: { url?: string; type?: string }[];
  };
  boosts?: { active?: number };
};

const EMPTY_WINDOW: DexWindow = {
  buys: null,
  sells: null,
  volumeUsd: null,
  priceChangePct: null,
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function window_(p: DexScreenerPair, key: "m5" | "h1" | "h6" | "h24"): DexWindow {
  const tx = p.txns?.[key];
  return {
    buys: num(tx?.buys),
    sells: num(tx?.sells),
    volumeUsd: num(p.volume?.[key]),
    priceChangePct: num(p.priceChange?.[key]),
  };
}

/** Normaliza o formato do fio pro nosso. Único lugar que faz essa tradução. */
export function toSnapshot(p: DexScreenerPair, now = Date.now()): DexPairSnapshot {
  const createdAt = num(p.pairCreatedAt);
  const price = p.priceUsd != null ? Number(p.priceUsd) : NaN;

  return {
    chainId: p.chainId ?? null,
    dexId: p.dexId ?? null,
    labels: Array.isArray(p.labels) ? p.labels.filter((l) => typeof l === "string") : [],
    pairAddress: p.pairAddress ?? null,
    pairUrl: p.url ?? null,
    tokenSymbol: p.baseToken?.symbol ?? null,
    tokenName: p.baseToken?.name ?? null,
    tokenAddress: p.baseToken?.address ?? null,
    quoteSymbol: p.quoteToken?.symbol ?? null,

    imageUrl: p.info?.imageUrl ?? null,
    headerUrl: p.info?.header ?? null,
    websites: (p.info?.websites ?? []).map((w) => w.url).filter((u): u is string => !!u),
    socials: (p.info?.socials ?? [])
      .filter((s): s is { url: string; type: string } => !!s.url && !!s.type)
      .map((s) => ({ type: s.type, url: s.url })),
    boostsActive: num(p.boosts?.active),

    priceUsd: Number.isFinite(price) ? price : null,
    liquidityUsd: num(p.liquidity?.usd),
    marketCapUsd: num(p.marketCap),
    fdvUsd: num(p.fdv),
    pairAgeHours:
      createdAt != null && createdAt > 0 ? Math.max(0, (now - createdAt) / 3_600_000) : null,

    m5: window_(p, "m5"),
    h1: window_(p, "h1"),
    h6: window_(p, "h6"),
    h24: window_(p, "h24"),

    fetchedAt: now,
    source: "DexScreener",
  };
}

export { EMPTY_WINDOW };
