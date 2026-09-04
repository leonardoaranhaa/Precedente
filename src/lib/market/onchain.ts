import { withCircuitBreaker } from "../circuit-breaker";
import type { OnchainContext } from "./types";

/**
 * Só existe UMA base real pra Futures — ao contrário do spot (que tem o
 * mirror documentado data-api.binance.vision), não existe um
 * "fapi.binance.vision" oficial: confirmado ao vivo (não resolve, 502 no
 * proxy) e pela documentação da Binance (developers.binance.com só lista
 * fapi.binance.com). Manter aqui como array deixa a porta aberta pra um
 * mirror real futuro sem mudar a lógica de novo.
 */
const FAPI = ["https://fapi.binance.com"] as const;

const DEX_SEARCH = "https://api.dexscreener.com/latest/dex/search";

/** Timeout curto: derivativos são enriquecimento best-effort, não podem
 * segurar o resultado principal (OHLC/precedente) por vários segundos. */
const DERIV_TIMEOUT_MS = 5_000;
const DERIV_BREAKER_OPTS = { failureThreshold: 5, cooldownMs: 20_000 };

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

/** Como fetchJson, mas lança em falha de rede/timeout/HTTP não-ok — usado
 * onde precisamos distinguir "serviço fora do ar" de "sem dado pra esse
 * símbolo" (200 ok, campo ausente). */
async function fetchJsonOrThrow<T>(url: string, timeoutMs: number): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
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

type DerivResult = {
  fundingRate: number | null;
  markPrice: number | null;
  openInterest: number | null;
  nextFundingTime: number | null;
  source: string | null;
};

/**
 * Tenta as duas bases (mesmo dado, hosts diferentes — mirror de geo).
 * Lança só quando NENHUMA base respondeu (rede/timeout/HTTP) — symbol sem
 * mercado de perp (200 ok, sem lastFundingRate) não é falha de serviço,
 * não deve contar pro circuito abrir nem tentar a base espelho à toa.
 */
async function fetchDerivativesUnguarded(symbol: string): Promise<DerivResult> {
  let lastError: Error | null = null;

  for (const base of FAPI) {
    let premium: PremiumIndex;
    try {
      premium = await fetchJsonOrThrow<PremiumIndex>(
        `${base}/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`,
        DERIV_TIMEOUT_MS,
      );
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }

    if (premium?.lastFundingRate == null) {
      // Base respondeu; símbolo sem perp listado — a base espelho tem o
      // mesmo catálogo, não vale a pena tentar de novo.
      return { fundingRate: null, markPrice: null, openInterest: null, nextFundingTime: null, source: null };
    }

    const fundingRate = Number(premium.lastFundingRate);
    const markPrice = premium.markPrice != null ? Number(premium.markPrice) : null;
    const nextFundingTime =
      typeof premium.nextFundingTime === "number" ? premium.nextFundingTime : null;
    let openInterest: number | null = null;
    try {
      const oi = await fetchJsonOrThrow<OpenInterest>(
        `${base}/fapi/v1/openInterest?symbol=${encodeURIComponent(symbol)}`,
        DERIV_TIMEOUT_MS,
      );
      if (oi?.openInterest != null) openInterest = Number(oi.openInterest);
    } catch {
      // OI é secundário — funding sozinho já é um dado útil.
    }
    return { fundingRate, markPrice, openInterest, nextFundingTime, source: "Binance Futures" };
  }

  throw lastError ?? new Error("Binance Futures indisponível (ambas as bases).");
}

async function fetchDerivatives(symbol: string): Promise<DerivResult> {
  try {
    return await withCircuitBreaker("Binance Futures", DERIV_BREAKER_OPTS, () =>
      fetchDerivativesUnguarded(symbol),
    );
  } catch {
    // Nunca lança pro chamador — fetchOnchainContext degrada com null.
    return { fundingRate: null, markPrice: null, openInterest: null, nextFundingTime: null, source: null };
  }
}

const DEX_TOKEN_PAIRS = "https://api.dexscreener.com/token-pairs/v1";

/**
 * Contrato/mint canônico dos majors — endereço real do ativo, não um par
 * específico (pares migram/secam; o contrato do token não muda). Cada
 * entrada foi validada ao vivo contra a API da DexScreener (símbolo +
 * liquidez condizentes) antes de entrar aqui.
 *
 * Fica de fora: XRP, DOGE, ADA — sem contrato EVM/Solana/Sui confiável
 * pra âncora; seguem no fallback de busca abaixo, igual antes.
 */
const CANONICAL_TOKENS: Record<string, { chainId: string; address: string }> = {
  BTC: { chainId: "ethereum", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" }, // WBTC
  ETH: { chainId: "ethereum", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" }, // WETH
  SOL: { chainId: "solana", address: "So11111111111111111111111111111111111111112" },
  BNB: { chainId: "bsc", address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" }, // WBNB
  LINK: { chainId: "ethereum", address: "0x514910771AF9Ca656af840dff83E8264EcF986CA" },
  AVAX: { chainId: "avalanche", address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7" }, // WAVAX
  SUI: { chainId: "sui", address: "0x2::sui::SUI" },
};

type DexPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  pairCreatedAt?: number;
  baseToken?: { symbol?: string; name?: string; address?: string };
  quoteToken?: { symbol?: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number; h6?: number; h1?: number };
  txns?: {
    h24?: { buys?: number; sells?: number };
    h6?: { buys?: number; sells?: number };
    h1?: { buys?: number; sells?: number };
  };
  priceChange?: { h24?: number; h6?: number; h1?: number };
  fdv?: number;
  marketCap?: number;
};

/** Transações nas últimas 24h. Um par sem negócio não é mercado, é vitrine. */
function txns24h(p: DexPair): number {
  return (p.txns?.h24?.buys ?? 0) + (p.txns?.h24?.sells ?? 0);
}

/**
 * Escolhe o par que melhor representa o token.
 *
 * Liquidez sozinha engana: existem pools com liquidez declarada absurda e
 * quase nenhum negócio. Visto na prática ao validar /api/dex — PEPE trazia
 * uma pool de US$ 9B com US$ 4 de volume e 1 compra/1 venda em 24h, e era
 * essa que ganhava. Como o par escolhido decide TODA a leitura de fragilidade,
 * atividade real precisa pesar tanto quanto profundidade.
 */
function scorePair(p: DexPair, base: string): number {
  const sym = (p.baseToken?.symbol ?? "").toUpperCase();
  const quote = (p.quoteToken?.symbol ?? "").toUpperCase();
  const liq = p.liquidity?.usd ?? 0;
  const vol = p.volume?.h24 ?? 0;
  let score = Math.log10(Math.max(liq, 1)) + Math.log10(Math.max(vol, 1));
  // Pool parada: profundidade que ninguém usa não descreve o mercado do token.
  if (txns24h(p) < 10) score -= 15;
  if (sym === base) score += 20;
  else if (sym.includes(base) || base.includes(sym)) score += 5;
  if (["USDT", "USDC", "USD", "DAI", "SOL", "WETH", "ETH", "WBNB"].includes(quote)) {
    score += 8;
  }
  return score;
}

function formatUsdShort(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

/** Texto factual para erro de par não listado — não é tela completa, só contexto. */
export function summarizeDexForError(ctx: OnchainContext): string | null {
  if (ctx.liquidityUsd == null && ctx.volume24hUsd == null) return null;
  const parts: string[] = [];
  if (ctx.liquidityUsd != null) parts.push(`liquidez DEX ~${formatUsdShort(ctx.liquidityUsd)}`);
  if (ctx.volume24hUsd != null) parts.push(`vol 24h ~${formatUsdShort(ctx.volume24hUsd)}`);
  if (ctx.pairAgeHours != null) {
    if (ctx.pairAgeHours < 48) parts.push(`par recente (~${Math.round(ctx.pairAgeHours)}h)`);
    else parts.push(`par ~${Math.round(ctx.pairAgeHours / 24)}d no DEX`);
  }
  if (ctx.chainId) parts.push(ctx.chainId);
  return parts.join(" · ");
}

async function fetchDexContext(symbol: string): Promise<{
  chainId: string | null;
  dexId: string | null;
  pairUrl: string | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  volume6hUsd: number | null;
  volume1hUsd: number | null;
  buys24h: number | null;
  sells24h: number | null;
  buys6h: number | null;
  sells6h: number | null;
  priceChange24hPct: number | null;
  priceChange6hPct: number | null;
  priceChange1hPct: number | null;
  pairAgeHours: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  source: string | null;
}> {
  const base = baseAsset(symbol);
  let best: DexPair | null = null;

  const canonical = CANONICAL_TOKENS[base];
  if (canonical) {
    const pairs = await fetchJson<DexPair[]>(
      `${DEX_TOKEN_PAIRS}/${canonical.chainId}/${encodeURIComponent(canonical.address)}`,
    );
    if (Array.isArray(pairs) && pairs.length > 0) {
      // Já ancorado no contrato certo, mas o mesmo problema de pool parada
      // vale aqui: o melhor par é o que tem profundidade E negócio.
      let bestScore = -Infinity;
      for (const p of pairs) {
        const s = scorePair(p, base);
        if (s > bestScore) {
          bestScore = s;
          best = p;
        }
      }
    }
  }

  if (!best) {
    // Sem entrada canônica (altcoin) ou lookup canônico falhou — volta
    // pra busca por nome, que já existia.
    const queries = [`${base}/USDT`, `${base}/USDC`, base];
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
      if (
        best &&
        (best.baseToken?.symbol ?? "").toUpperCase() === base &&
        (best.liquidity?.usd ?? 0) > 50_000
      ) {
        break;
      }
    }
  }

  if (!best) {
    return {
      chainId: null,
      dexId: null,
      pairUrl: null,
      liquidityUsd: null,
      volume24hUsd: null,
      volume6hUsd: null,
      volume1hUsd: null,
      buys24h: null,
      sells24h: null,
      buys6h: null,
      sells6h: null,
      priceChange24hPct: null,
      priceChange6hPct: null,
      priceChange1hPct: null,
      pairAgeHours: null,
      marketCapUsd: null,
      fdvUsd: null,
      source: null,
    };
  }

  let pairAgeHours: number | null = null;
  if (typeof best.pairCreatedAt === "number" && best.pairCreatedAt > 0) {
    pairAgeHours = Math.max(0, (Date.now() - best.pairCreatedAt) / 3_600_000);
  }

  return {
    chainId: best.chainId ?? null,
    dexId: best.dexId ?? null,
    pairUrl: best.url ?? null,
    liquidityUsd: best.liquidity?.usd ?? null,
    volume24hUsd: best.volume?.h24 ?? null,
    volume6hUsd: best.volume?.h6 ?? null,
    volume1hUsd: best.volume?.h1 ?? null,
    buys24h: best.txns?.h24?.buys ?? null,
    sells24h: best.txns?.h24?.sells ?? null,
    buys6h: best.txns?.h6?.buys ?? null,
    sells6h: best.txns?.h6?.sells ?? null,
    priceChange24hPct:
      typeof best.priceChange?.h24 === "number" ? best.priceChange.h24 : null,
    priceChange6hPct:
      typeof best.priceChange?.h6 === "number" ? best.priceChange.h6 : null,
    priceChange1hPct:
      typeof best.priceChange?.h1 === "number" ? best.priceChange.h1 : null,
    pairAgeHours,
    marketCapUsd: typeof best.marketCap === "number" ? best.marketCap : null,
    fdvUsd: typeof best.fdv === "number" ? best.fdv : null,
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
    volume6hUsd: dex.volume6hUsd,
    volume1hUsd: dex.volume1hUsd,
    buys24h: dex.buys24h,
    sells24h: dex.sells24h,
    buys6h: dex.buys6h,
    sells6h: dex.sells6h,
    priceChange24hPct: dex.priceChange24hPct,
    priceChange6hPct: dex.priceChange6hPct,
    priceChange1hPct: dex.priceChange1hPct,
    pairAgeHours: dex.pairAgeHours,
    marketCapUsd: dex.marketCapUsd,
    fdvUsd: dex.fdvUsd,
    dexSource: dex.source,
    sources,
  };
}
