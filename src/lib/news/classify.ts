import type { NewsCategory } from "./types.ts";

/**
 * Classificação por palavra-chave — sem LLM, sem custo, roda em milissegundos
 * pra centenas de itens. Aproximado por natureza (um resumo de notícia não
 * tem estrutura garantida); o objetivo é filtrar o grosso, não ser perfeito.
 */

// Ticker -> variações de nome que aparecem em manchete (case-insensitive,
// casadas como palavra inteira). Cobre as moedas mais líquidas/negociadas —
// suficiente pro protótipo; crescer essa lista não muda a lógica.
const COIN_ALIASES: Record<string, string[]> = {
  BTC: ["bitcoin", "btc"],
  ETH: ["ethereum", "ether", "eth"],
  SOL: ["solana", "sol"],
  XRP: ["ripple", "xrp"],
  ADA: ["cardano", "ada"],
  DOGE: ["dogecoin", "doge"],
  BNB: ["binance coin", "bnb"],
  AVAX: ["avalanche", "avax"],
  LINK: ["chainlink"],
  DOT: ["polkadot"],
  LTC: ["litecoin", "ltc"],
  TRX: ["tron", "trx"],
  SHIB: ["shiba inu", "shib"],
  UNI: ["uniswap", "uni"],
  ATOM: ["cosmos"],
  NEAR: ["near protocol"],
  APT: ["aptos", "apt"],
  ARB: ["arbitrum"],
  OP: ["optimism"],
  ZEC: ["zcash", "zec"],
};

/**
 * Tickers cuja forma "nua" em minúsculas colide com palavra comum do inglês
 * ("near", "dot", "link", "arb", "atom", "op") — tirados de COIN_ALIASES
 * acima (achado de revisão: "Bitcoin price near key resistance level"
 * marcava NEAR; "Fed's dot plot" marcava DOT). Pra esses, só conta a menção
 * do ticker quando aparece em MAIÚSCULAS isolado, ou com "$" na frente em
 * qualquer caixa — como manchete real escreve ticker ("LINK surges 12%",
 * "$ARB rallies"), nunca em minúsculas soltas.
 */
const AMBIGUOUS_TICKERS = new Set(["LINK", "DOT", "ATOM", "NEAR", "ARB", "OP"]);

function ambiguousTickerMatch(text: string, ticker: string): boolean {
  const escaped = ticker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const caps = new RegExp(`(?:^|[^A-Za-z0-9])${escaped}(?:$|[^A-Za-z0-9])`);
  if (caps.test(text)) return true;
  return new RegExp(`\\$${escaped}\\b`, "i").test(text);
}

/**
 * As fontes configuradas (`sources.ts`) publicam em inglês — por isso cada
 * categoria carrega termos em inglês E em português (a UI é em PT-BR, mas o
 * texto classificado vem do feed original). Achado do teste de campo: com
 * só termos em PT, a taxa de categorização em manchetes reais de
 * CoinDesk/Cointelegraph/Decrypt ficou em ~17%; com inglês incluído, sobe
 * bem mais (ver `field-test-news.mjs`).
 */
const CATEGORY_KEYWORDS: Record<NewsCategory, string[]> = {
  regulatory: [
    "sec",
    "cftc",
    "doj",
    "cvm",
    "regulation",
    "regulated",
    "regulatory",
    "lawsuit",
    "sue",
    "sued",
    "charges",
    "settlement",
    "bill",
    "congress",
    "senate",
    "ban",
    "banned",
    "license",
    "licensed",
    "clarity act",
    "regulação",
    "regulacao",
    "lei",
    "congresso",
    "proibição",
    "proibicao",
    "licença",
    "licenca",
  ],
  security: [
    "hack",
    "hacked",
    "hacker",
    "exploit",
    "exploited",
    "stolen",
    "theft",
    "scam",
    "breach",
    "drained",
    "malware",
    "compromised",
    "phishing",
    "vulnerability",
    "roubo",
    "roubado",
    "vulnerabilidade",
    "golpe",
  ],
  institutional: [
    "etf",
    "blackrock",
    "institutional",
    "hedge fund",
    "investment fund",
    "wall street",
    "custody",
    "fidelity",
    "grayscale",
    "ipo",
    "bank",
    "banks",
    "goldman sachs",
    "jpmorgan",
    "treasury",
    "institucional",
    "custódia",
    "custodia",
  ],
  technology: [
    "upgrade",
    "protocol",
    "mainnet",
    "testnet",
    "hard fork",
    "fork",
    "roadmap",
    "layer 2",
    "l2",
    "network upgrade",
    "protocolo",
    "atualização",
    "atualizacao",
  ],
  market: [
    "price",
    "rally",
    "surge",
    "surges",
    "plunge",
    "plunges",
    "crash",
    "all-time high",
    "ath",
    "outflow",
    "outflows",
    "inflow",
    "inflows",
    "liquidity",
    "volume",
    "preço",
    "preco",
    "alta",
    "queda",
    "mercado",
  ],
};

/** Lista de tickers reconhecidos — reusada pelo seletor de moedas na UI. */
export const KNOWN_COINS: string[] = Object.keys(COIN_ALIASES);

function wordBoundaryMatch(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i").test(haystack);
}

export function detectCoins(text: string): string[] {
  const found: string[] = [];
  for (const [ticker, aliases] of Object.entries(COIN_ALIASES)) {
    if (aliases.some((a) => wordBoundaryMatch(text, a))) {
      found.push(ticker);
      continue;
    }
    if (AMBIGUOUS_TICKERS.has(ticker) && ambiguousTickerMatch(text, ticker)) {
      found.push(ticker);
    }
  }
  return found;
}

export function detectCategories(text: string): NewsCategory[] {
  const found: NewsCategory[] = [];
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    NewsCategory,
    string[],
  ][]) {
    if (keywords.some((k) => wordBoundaryMatch(text, k))) found.push(category);
  }
  return found;
}
