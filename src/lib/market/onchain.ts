import type { OnchainContext } from "./types";

const FAPI = [
  "https://fapi.binance.com",
  "https://fapi.binance.vision",
] as const;

const DEX_SEARCH = "https://api.dexscreener.com/latest/dex/search";

function baseAsset(symbol: string): string {
  const s = symbol.toUpperCase();
  for (const q of ["USDT", "USDC", "BUSD", "FDUSD", "BRL"]) {
    if (s.endsWith(q) && s.length > q.length) return s.slice(0, -q.length);
  }
  return s;
}

async function fetchJson<T>(url: string, timeoutMs = 8_000): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type PremiumIndex = {
  symbol?: string;
  lastFundingRate?: string;
  markPrice?: string;
  indexPrice?: string;
  nextFundingTime?: number;
};

type OpenInterest = {
  symbol?: string;
  openInterest?: string;
};

async function fetchDerivatives(symbol: string): Promise<{
  fundingRate: number | null;
  markPrice: number | null;
  openInterest: number | null;
  nextFundingTime: number | null;
  source: string | null;
}> {
  let fundingRate: number | null = null;
  let markPrice: number | null = null;
  let openInterest: number | null = null;
  let nextFundingTime: number | null = null;
  let source: string | null = null;

  for (const base of FAPI) {
    const premium = await fetchJson<PremiumIndex>(
      `${base}/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`,
    );
    if (premium?.lastFundingRate != null) {
      fundingRate = Number(premium.lastFundingRate);
      markPrice = premium.markPrice != null ? Number(premium.markPrice) : null;
      nextFundingTime =
        typeof premium.nextFundingTime === "number" ? premium.nextFundingTime : null;
      source = "Binance Futures";
      const oi = await fetchJson<OpenInterest>(
        `${base}/fapi/v1/openInterest?symbol=${encodeURIComponent(symbol)}`,
      );
      if (oi?.openInterest != null) openInterest = Number(oi.openInterest);
      break;
    }
  }

  return { fundingRate, markPrice, openInterest, nextFundingTime, source };
}

type DexPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: { symbol?: string; name?: string; address?: string };
  quoteToken?: { symbol?: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number; h6?: number; h1?: number };
  txns?: {
    h24?: { buys?: number; sells?: number };
    h6?: { buys?: number; sells?: number };
  };
  priceChange?: { h24?: number; h6?: number; h1?: number };
  fdv?: number;
  marketCap?: number;
};

function scorePair(p: DexPair, base: string): number {
  const sym = (p.baseToken?.symbol ?? "").toUpperCase();
  const quote = (p.quoteToken?.symbol ?? "").toUpperCase();
  const liq = p.liquidity?.usd ?? 0;
  let score = Math.log10(Math.max(liq, 1));
  if (sym === base) score += 20;
  else if (sym.includes(base) || base.includes(sym)) score += 5;
  if (["USDT", "USDC", "USD", "DAI", "SOL", "WETH", "ETH", "WBNB"].includes(quote)) {
    score += 8;
  }
  return score;
}

async function fetchDexContext(symbol: string): Promise<{
  chainId: string | null;
  dexId: string | null;
  pairUrl: string | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  buys24h: number | null;
  sells24h: number | null;
  priceChange24hPct: number | null;
  source: string | null;
}> {
  const base = baseAsset(symbol);
  const queries = [`${base}/USDT`, `${base}/USDC`, base];
  let best: DexPair | null = null;
  let bestScore = -1;

  for (const q of queries) {
    const data = await fetchJson<{ pairs?: DexPair[] }>(
      `${DEX_SEARCH}?q=${encodeURIComponent(q)}`,
    );
    const pairs = data?.pairs ?? [];
    for (const p of pairs) {
      const s = scorePair(p, base);
      if (s > bestScore) {
        bestScore = s;
        best = p;
      }
    }
    // se já achou par com símbolo exato + liquidez decente, para
    if (
      best &&
      (best.baseToken?.symbol ?? "").toUpperCase() === base &&
      (best.liquidity?.usd ?? 0) > 50_000
    ) {
      break;
    }
  }

  if (!best) {
    return {
      chainId: null,
      dexId: null,
      pairUrl: null,
      liquidityUsd: null,
      volume24hUsd: null,
      buys24h: null,
      sells24h: null,
      priceChange24hPct: null,
      source: null,
    };
  }

  const buys = best.txns?.h24?.buys ?? null;
  const sells = best.txns?.h24?.sells ?? null;

  return {
    chainId: best.chainId ?? null,
    dexId: best.dexId ?? null,
    pairUrl: best.url ?? null,
    liquidityUsd: best.liquidity?.usd ?? null,
    volume24hUsd: best.volume?.h24 ?? null,
    buys24h: buys,
    sells24h: sells,
    priceChange24hPct:
      typeof best.priceChange?.h24 === "number" ? best.priceChange.h24 : null,
    source: "DexScreener",
  };
}

/**
 * Contexto on-chain / derivativos para o par.
 * Nunca lança: se uma fonte falhar, o resto segue e campos ficam null.
 */
export async function fetchOnchainContext(symbol: string): Promise<OnchainContext> {
  const [deriv, dex] = await Promise.all([
    fetchDerivatives(symbol),
    fetchDexContext(symbol),
  ]);

  const sources = [deriv.source, dex.source].filter(Boolean) as string[];

  return {
    fetchedAt: Date.now(),
    fundingRate: deriv.fundingRate,
    markPrice: deriv.markPrice,
    openInterest: deriv.openInterest,
    nextFundingTime: deriv.nextFundingTime,
    derivativesSource: deriv.source,
    chainId: dex.chainId,
    dexId: dex.dexId,
    pairUrl: dex.pairUrl,
    liquidityUsd: dex.liquidityUsd,
    volume24hUsd: dex.volume24hUsd,
    buys24h: dex.buys24h,
    sells24h: dex.sells24h,
    priceChange24hPct: dex.priceChange24hPct,
    dexSource: dex.source,
    sources,
  };
}
