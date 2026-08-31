export const TIMEFRAMES = ["15m", "1h", "4h", "1d"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export const POPULAR_TICKERS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "LINKUSDT",
  "AVAXUSDT",
  "SUIUSDT",
  "ADAUSDT",
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
  /**
   * Excursão do caminho, não do fim: o quanto o preço afundou (drawdown) e
   * subiu (runup) ANTES de chegar ao fim do horizonte. Em ativos que disparam
   * e despencam, o retorno final é quase moeda ao ar enquanto o caminho
   * decide quem sobrevive — é o drawdown que liquida posição alavancada.
   */
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
  /** Matches cujo timestamp cai dentro do `chart` (últimas barras visíveis) — pra marcar no candle chart. */
  chartMatches: { t: number; score: number }[];
};

/** Contexto de derivativos + liquidez DEX (quando disponível). */
export type OnchainContext = {
  fetchedAt: number;
  /** Funding atual (fração por período, ex. 0.0001 = 0,01%). */
  fundingRate: number | null;
  markPrice: number | null;
  /** Open interest em contratos (unidade da exchange). */
  openInterest: number | null;
  nextFundingTime: number | null;
  derivativesSource: string | null;
  chainId: string | null;
  dexId: string | null;
  pairUrl: string | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  buys24h: number | null;
  sells24h: number | null;
  priceChange24hPct: number | null;
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
  /** Opcional: funding/OI + liquidez DEX. Null se todas as fontes falharem. */
  onchain: OnchainContext | null;
};

export type StoredAnalysis = AnalysisPayload & {
  id: string;
  createdAt: number;
  hasImage: boolean;
  thumb: string | null;
};
