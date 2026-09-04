export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
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
  baseline: { upPct: number; medianPct: number; medianDrawdownPct: number };
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
  patternRegion: { x: number; y: number; width: number; height: number } | null;
};

export type PrecedentResult = {
  fingerprint: {
    rsiBucket: string;
    vsSma20: string;
    vsSma50: string;
    extreme: string;
    direction: string;
  };
  fingerprintLabel: string;
  matches: number;
  total: number;
  relaxed: string[];
  sampleNote: "ok" | "small" | "tiny";
  horizons: HorizonOutcome[];
  recentMatches: { t: number; forward: number; score: number }[];
  chartMatches: { t: number; score: number }[];
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

export type OnchainContext = {
  fundingRate: number | null;
  openInterest: number | null;
  markPrice: number | null;
  liquidityUsd: number | null;
  [key: string]: unknown;
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
};
