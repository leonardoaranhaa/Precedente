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

export type VisionReading = {
  tendencia: "alta" | "baixa" | "lateral" | "indefinida";
  padrao: string | null;
  suporteResistencia: string | null;
  indicadoresVisiveis: string[];
  timeframeAparente: string | null;
  ativoAparente: string | null;
  leitura: string;
  confianca: "alta" | "media" | "baixa";
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
