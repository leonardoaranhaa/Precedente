export const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

/** Agrupamento de momento gráfico pra organizar os chips de TF na UI. */
export const TIMEFRAME_GROUPS = [
  { key: "scalp", label: "Scalp", tfs: ["1m", "5m"] },
  { key: "intraday", label: "Intraday", tfs: ["15m", "1h"] },
  { key: "swing", label: "Swing", tfs: ["4h", "1d"] },
] as const satisfies { key: string; label: string; tfs: readonly Timeframe[] }[];
export type TimeframeGroupKey = (typeof TIMEFRAME_GROUPS)[number]["key"];

export const WATCH_REFRESH_MINUTES = [0, 1, 5, 15] as const;
export type WatchRefreshMinutes = (typeof WATCH_REFRESH_MINUTES)[number];

export const POPULAR_TICKERS = [
  "BTC",
  "ETH",
  "SOL",
  "BNB",
  "XRP",
  "DOGE",
  "LINK",
  "AVAX",
  "SUI",
  "ADA",
] as const;

export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type MaSide = "above" | "below" | "near";
export type Extreme = "high20" | "low20" | "none";
export type Direction = "up" | "down";

export type Fingerprint = {
  rsiBucket: string;
  vsSma20: MaSide;
  vsSma50: MaSide;
  extreme: Extreme;
  direction: Direction;
};

export type HorizonOutcome = {
  bars: number;
  label: string;
  samples: number;
  upPct: number;
  downPct: number;
  flatPct: number;
  medianPct: number;
  meanPct: number;
  p10: number;
  p90: number;
  medianPath: number[];
  medianDrawdownPct: number;
  worstDrawdownPct: number;
  medianRunupPct: number;
  baseline: {
    upPct: number;
    medianPct: number;
    medianDrawdownPct: number;
  };
};

export type Snapshot = {
  last: Candle;
  prev: Candle | null;
  rsi14: number;
  sma20: number;
  sma50: number;
  sma200: number | null;
  distSma20Pct: number;
  distSma50Pct: number;
  high20: number;
  low20: number;
  near20High: boolean;
  near20Low: boolean;
  consecutive: number;
  lastExtrema: { type: "top" | "bottom"; barsAgo: number; price: number } | null;
  changePct: number;
};

export type ChartPoint = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  sma20: number | null;
  sma50: number | null;
};

/** Caixa aproximada do padrão no print, em frações 0..1 da imagem (origem no canto superior esquerdo). */
export type PatternRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type VisionReading = {
  tendencia: "alta" | "baixa" | "lateral" | "indefinida";
  padrao: string | null;
  suporteResistencia: string | null;
  indicadoresVisiveis: string[];
  timeframeAparente: string | null;
  ativoAparente: string | null;
  leitura: string;
  confianca: "alta" | "media" | "baixa";
  /** null quando não há padrão citado, ou o modelo não está confiante na localização. */
  patternRegion: PatternRegion | null;
};

export type PrecedentResult = {
  fingerprint: Fingerprint;
  fingerprintLabel: string;
  matches: number;
  total: number;
  relaxed: string[];
  sampleNote: "ok" | "small" | "tiny";
  horizons: HorizonOutcome[];
  recentMatches: { t: number; forward: number; score: number }[];
  chartMatches: { t: number; score: number }[];
};

export type OnchainContext = {
  fetchedAt: number;
  fundingRate: number | null;
  markPrice: number | null;
  openInterest: number | null;
  nextFundingTime: number | null;
  derivativesSource: string | null;
  chainId: string | null;
  dexId: string | null;
  pairUrl: string | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  volume6hUsd?: number | null;
  volume1hUsd?: number | null;
  buys24h: number | null;
  sells24h: number | null;
  buys6h?: number | null;
  sells6h?: number | null;
  priceChange24hPct: number | null;
  priceChange6hPct?: number | null;
  priceChange1hPct?: number | null;
  pairAgeHours?: number | null;
  /** Valor de mercado circulante e diluído, como o DexScreener mostra.
   * Liquidez contra market cap é a leitura de saída: quanto do valor
   * de papel realmente cabe na pool. */
  marketCapUsd?: number | null;
  fdvUsd?: number | null;
  dexSource: string | null;
  sources: string[];
};

export type AnalysisPayload = {
  ticker: string;
  displayTicker: string;
  timeframe: Timeframe;
  fetchedAt: number;
  candleCount: number;
  snapshot: Snapshot;
  precedent: PrecedentResult;
  chart: ChartPoint[];
  vision: VisionReading | null;
  visionError: string | null;
  /** Cota diária de leitura de print — só vem quando os gates de billing estão ligados. */
  visionQuota?: {
    used: number;
    limit: number;
    remaining: number;
    nearLimit: boolean;
    exhausted: boolean;
    message: string | null;
  } | null;
  source: string;
  onchain?: OnchainContext | null;
};

export type StoredAnalysis = AnalysisPayload & {
  id: string;
  createdAt: number;
  hasImage: boolean;
  thumbUri: string | null;
};

export type ApiErrorBody = { error: string };

export type TradedPair = {
  symbol: string;
  display: string;
  base: string;
  lastPrice: number;
  changePct: number;
  quoteVolume: number;
};

// --- DEX: leitura de fragilidade (tokens de ciclo curto) -------------------
// Espelha src/lib/market/dex/ do web. NÃO é precedente: um par de horas não
// tem histórico de candles pra estatística de caminho, então aqui não há
// mediana, drawdown nem P10/P90 — só o estado do par agora.

export type DexWindow = {
  buys: number | null;
  sells: number | null;
  volumeUsd: number | null;
  priceChangePct: number | null;
};

export type DexSocial = { type: string; url: string };

export type DexPairSnapshot = {
  chainId: string | null;
  dexId: string | null;
  labels: string[];
  pairAddress: string | null;
  pairUrl: string | null;
  tokenSymbol: string | null;
  tokenName: string | null;
  tokenAddress: string | null;
  quoteSymbol: string | null;
  imageUrl: string | null;
  headerUrl: string | null;
  websites: string[];
  socials: DexSocial[];
  boostsActive: number | null;
  priceUsd: number | null;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  pairAgeHours: number | null;
  m5: DexWindow;
  h1: DexWindow;
  h6: DexWindow;
  h24: DexWindow;
  fetchedAt: number;
  source: string;
};

export type FragilityLevel = "extrema" | "alta" | "media" | "observavel";

export type FragilityFlag = {
  id: string;
  label: string;
  detail: string;
  severity: "alta" | "media";
};

export type DexFragilityReport = {
  level: FragilityLevel;
  flags: FragilityFlag[];
  metrics: {
    liquidityUsd: number | null;
    volume24hUsd: number | null;
    turnover24h: number | null;
    sellRatio24h: number | null;
    sellRatio6h: number | null;
    volumeTrend: number | null;
    pairAgeHours: number | null;
    marketCapUsd: number | null;
    liqToMcap: number | null;
  };
  disclaimer: string;
};

export type DexReading = { pair: DexPairSnapshot; fragility: DexFragilityReport };

// --- Movers: maiores movimentações 24h (Binance spot USDT) -----------------

export type MoverRow = {
  symbol: string;
  base: string;
  lastPrice: number;
  changePct: number;
  volumeBase: number;
  quoteVolume: number;
  high: number;
  low: number;
  open: number;
  session: "acima" | "abaixo" | "lateral";
  rangePct: number;
};

export type MoversSnapshot = {
  fetchedAt: number;
  source: string;
  byAbsChange: MoverRow[];
  byQuoteVolume: MoverRow[];
  gainers: MoverRow[];
  losers: MoverRow[];
  disclaimer: string;
};

// --- New Listings: moedas recém-listadas (detectadas por diff de snapshot) ----

export type NewListingRow = {
  symbol: string;
  base: string;
  lastPrice: number;
  changePct: number;
  quoteVolume: number;
  high: number;
  low: number;
  firstSeenAt: number;
  ageHours: number;
};

export type NewListingsSnapshot = {
  fetchedAt: number;
  source: string;
  listings: NewListingRow[];
  totalTracked: number;
  disclaimer: string;
};
