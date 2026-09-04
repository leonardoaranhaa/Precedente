import type { Timeframe } from "@/lib/market/types";

export type AlertKind =
  | "sample_weak"
  | "sample_regime"
  | "drawdown_path"
  | "extreme_20"
  | "price_zone"
  | "rsi_zone"
  | "funding_extreme"
  | "volume_anomaly"
  | "dex_drain";

export type AlertRules = {
  sampleWeak: boolean;
  sampleRegime: boolean;
  drawdownPath: boolean;
  drawdownThresholdPct: number;
  extreme20: boolean;
  fundingExtreme: boolean;
  fundingThreshold: number;
  volumeAnomaly: boolean;
  volumeMultiple: number;
};

export const DEFAULT_ALERT_RULES: AlertRules = {
  sampleWeak: true,
  sampleRegime: true,
  drawdownPath: true,
  drawdownThresholdPct: 5,
  extreme20: true,
  fundingExtreme: true,
  fundingThreshold: 0.0005,
  volumeAnomaly: true,
  volumeMultiple: 3,
};

export type PriceZone = {
  enabled: boolean;
  min: number | null;
  max: number | null;
};

export type RsiZone = {
  enabled: boolean;
  below: number | null;
  above: number | null;
};

export type WatchTarget = {
  ticker: string;
  timeframe: Timeframe;
  displayTicker?: string;
  priceZone?: PriceZone;
  rsiZone?: RsiZone;
};

export type PushSubscription = {
  token: string;
  platform: "ios" | "android" | "web" | "unknown";
  watches: WatchTarget[];
  rules: AlertRules;
  updatedAt: number;
  lastSent: Record<string, number>;
  digestEnabled: boolean;
  digestHourUtc: number;
  includeMovers: boolean;
  lastDigestAt: number | null;
  userId: string | null;
  /** Tickers DEX pinados pro alerta de drenagem. Sem timeframe — não têm candles. */
  dexWatches: string[];
};

/** Bem menor que MAX_WATCHES: tokens de ciclo curto têm alta rotatividade —
 * uma lista grande de moedas já mortas não ajuda ninguém. */
export const MAX_DEX_WATCHES = 12;

export const DEFAULT_DIGEST = {
  digestEnabled: false,
  digestHourUtc: 12,
  includeMovers: true,
  lastDigestAt: null as number | null,
};

export type AlertEvent = {
  kind: AlertKind;
  ticker: string;
  // Eventos DEX (dex_drain) não têm timeframe — o token não tem candle.
  timeframe: Timeframe | null;
  displayTicker: string;
  title: string;
  body: string;
};
