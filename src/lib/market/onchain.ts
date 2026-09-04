import { withCircuitBreaker } from "../circuit-breaker";
// Estático de propósito: onchain.ts só é alcançado por import() dinâmico, e
// dex/fetch nunca é importado dinamicamente. Ver docs/dex-arquitetura.md.
import { fetchDexPair } from "./dex/fetch";
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

/** Timeout curto: derivativos são enriquecimento best-effort, não podem
 * segurar o resultado principal (OHLC/precedente) por vários segundos. */
const DERIV_TIMEOUT_MS = 5_000;
const DERIV_BREAKER_OPTS = { failureThreshold: 5, cooldownMs: 20_000 };

/** GET JSON que LANÇA em falha de rede/timeout/HTTP não-ok — usado
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

/**
 * Contexto on-chain / derivativos para o par.
 * Nunca lança: se uma fonte falhar, o resto segue e campos ficam null.
 */
export async function fetchOnchainContext(symbol: string): Promise<OnchainContext> {
  const [deriv, dex] = await Promise.all([
    fetchDerivatives(symbol),
    fetchDexPair(symbol),
  ]);

  const sources = [deriv.source, dex?.source].filter(Boolean) as string[];

  // Achata o snapshot do par nos campos que OnchainContext já expõe. O
  // snapshot completo (ícone, socials, janela de 5m, boosts) fica disponível
  // por /api/dex — aqui só entra o que a análise de precedente usa.
  return {
    fetchedAt: Date.now(),
    fundingRate: deriv.fundingRate,
    markPrice: deriv.markPrice,
    openInterest: deriv.openInterest,
    nextFundingTime: deriv.nextFundingTime,
    derivativesSource: deriv.source,
    chainId: dex?.chainId ?? null,
    dexId: dex?.dexId ?? null,
    pairUrl: dex?.pairUrl ?? null,
    liquidityUsd: dex?.liquidityUsd ?? null,
    volume24hUsd: dex?.h24.volumeUsd ?? null,
    volume6hUsd: dex?.h6.volumeUsd ?? null,
    volume1hUsd: dex?.h1.volumeUsd ?? null,
    buys24h: dex?.h24.buys ?? null,
    sells24h: dex?.h24.sells ?? null,
    buys6h: dex?.h6.buys ?? null,
    sells6h: dex?.h6.sells ?? null,
    priceChange24hPct: dex?.h24.priceChangePct ?? null,
    priceChange6hPct: dex?.h6.priceChangePct ?? null,
    priceChange1hPct: dex?.h1.priceChangePct ?? null,
    pairAgeHours: dex?.pairAgeHours ?? null,
    marketCapUsd: dex?.marketCapUsd ?? null,
    fdvUsd: dex?.fdvUsd ?? null,
    dexSource: dex?.source ?? null,
    sources,
  };
}
