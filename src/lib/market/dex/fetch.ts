/**
 * CAMADA 1 — DADOS. Busca o par que melhor representa um token no DEX.
 *
 * Único ponto do projeto que fala com a API do DexScreener. Antes essa
 * lógica vivia dentro de onchain.ts; foi extraída pra cá porque passou a ter
 * dois consumidores (o enriquecimento da análise e a rota /api/dex), e uma
 * heurística de seleção de par duplicada é uma heurística que se conserta
 * pela metade.
 *
 * IMPORTA E É IMPORTADO ESTATICAMENTE dentro de dex/. Quem está fora entra
 * pela fachada (dex/index.ts) via import() dinâmico — misturar as duas formas
 * no mesmo módulo corrompe o chunk do Rolldown. Ver docs/dex-arquitetura.md.
 */

import { baseAsset } from "../symbol";
import { toSnapshot, type DexPairSnapshot, type DexScreenerPair } from "./types";

const DEX_SEARCH = "https://api.dexscreener.com/latest/dex/search";
const DEX_TOKEN_PAIRS = "https://api.dexscreener.com/token-pairs/v1";

/**
 * Contrato/mint canônico dos majors — endereço real do ativo, não um par
 * específico (pares migram/secam; o contrato do token não muda). Cada
 * entrada foi validada ao vivo contra a API da DexScreener (símbolo +
 * liquidez condizentes) antes de entrar aqui.
 *
 * Fica de fora: XRP, DOGE, ADA — sem contrato EVM/Solana/Sui confiável
 * pra âncora; seguem no fallback de busca abaixo.
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

const STABLE_OR_MAJOR_QUOTES = ["USDT", "USDC", "USD", "DAI", "SOL", "WETH", "ETH", "WBNB"];

/** Abaixo disso o par não é mercado, é vitrine. */
const MIN_TXNS_24H = 10;
const PENALIDADE_POOL_PARADA = 15;

/** Liquidez a partir da qual paramos de procurar um par melhor. */
const LIQ_SUFICIENTE = 50_000;

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

function txns24h(p: DexScreenerPair): number {
  return (p.txns?.h24?.buys ?? 0) + (p.txns?.h24?.sells ?? 0);
}

/**
 * Escolhe o par que melhor representa o token.
 *
 * Liquidez sozinha engana: existem pools com liquidez declarada absurda e
 * quase nenhum negócio. Visto na prática ao validar /api/dex — PEPE trazia
 * uma pool de US$ 9B com US$ 4 de volume e 1 compra/1 venda em 24h, e era
 * essa que ganhava. Como o par escolhido decide TODA a leitura de
 * fragilidade, atividade real precisa pesar tanto quanto profundidade.
 */
export function scorePair(p: DexScreenerPair, base: string): number {
  const sym = (p.baseToken?.symbol ?? "").toUpperCase();
  const quote = (p.quoteToken?.symbol ?? "").toUpperCase();
  const liq = p.liquidity?.usd ?? 0;
  const vol = p.volume?.h24 ?? 0;

  let score = Math.log10(Math.max(liq, 1)) + Math.log10(Math.max(vol, 1));
  if (txns24h(p) < MIN_TXNS_24H) score -= PENALIDADE_POOL_PARADA;
  if (sym === base) score += 20;
  else if (sym.includes(base) || base.includes(sym)) score += 5;
  if (STABLE_OR_MAJOR_QUOTES.includes(quote)) score += 8;
  return score;
}

function best(pairs: DexScreenerPair[], base: string): DexScreenerPair | null {
  let winner: DexScreenerPair | null = null;
  let bestScore = -Infinity;
  for (const p of pairs) {
    const s = scorePair(p, base);
    if (s > bestScore) {
      bestScore = s;
      winner = p;
    }
  }
  return winner;
}

/**
 * Par do token no DEX, ou null quando não existe nenhum.
 * Nunca lança: falha de rede degrada pra null, igual ao resto do
 * enriquecimento on-chain.
 */
export async function fetchDexPair(symbol: string): Promise<DexPairSnapshot | null> {
  const base = baseAsset(symbol);
  let chosen: DexScreenerPair | null = null;

  const canonical = CANONICAL_TOKENS[base];
  if (canonical) {
    const pairs = await fetchJson<DexScreenerPair[]>(
      `${DEX_TOKEN_PAIRS}/${canonical.chainId}/${encodeURIComponent(canonical.address)}`,
    );
    // Já ancorado no contrato certo, mas o problema de pool parada vale aqui
    // também: o melhor par é o que tem profundidade E negócio.
    if (Array.isArray(pairs) && pairs.length > 0) chosen = best(pairs, base);
  }

  if (!chosen) {
    // Sem entrada canônica (altcoin) ou lookup canônico falhou — busca por nome.
    for (const q of [`${base}/USDT`, `${base}/USDC`, base]) {
      const data = await fetchJson<{ pairs?: DexScreenerPair[] }>(
        `${DEX_SEARCH}?q=${encodeURIComponent(q)}`,
      );
      const candidate = best(data?.pairs ?? [], base);
      if (candidate && scorePair(candidate, base) > (chosen ? scorePair(chosen, base) : -Infinity)) {
        chosen = candidate;
      }
      if (
        chosen &&
        (chosen.baseToken?.symbol ?? "").toUpperCase() === base &&
        (chosen.liquidity?.usd ?? 0) > LIQ_SUFICIENTE
      ) {
        break;
      }
    }
  }

  return chosen ? toSnapshot(chosen) : null;
}
