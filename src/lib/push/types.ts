import type { Timeframe } from "@/lib/market/types";

export type AlertKind =
  | "sample_weak"
  | "drawdown_path"
  | "extreme_20"
  | "price_zone"
  | "rsi_zone";

export type AlertRules = {
  /** Avisa se amostra small ou tiny. */
  sampleWeak: boolean;
  /** Avisa se |DD mediano H10| >= limiar (%). */
  drawdownPath: boolean;
  drawdownThresholdPct: number;
  /** Avisa se preço colado na máxima/mínima de 20 barras. */
  extreme20: boolean;
};

export const DEFAULT_ALERT_RULES: AlertRules = {
  sampleWeak: true,
  drawdownPath: true,
  drawdownThresholdPct: 5,
  extreme20: true,
};

/** Zona de preço configurada por ativo — dispara quando o fechamento cai dentro da faixa. */
export type PriceZone = {
  enabled: boolean;
  /** null = sem piso. */
  min: number | null;
  /** null = sem teto. */
  max: number | null;
};

/** Zona de RSI configurada por ativo — dispara quando o RSI cruza um dos limites. */
export type RsiZone = {
  enabled: boolean;
  /** Dispara quando RSI <= below. null = desligado. */
  below: number | null;
  /** Dispara quando RSI >= above. null = desligado. */
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
  /** key = `${ticker}:${tf}:${kind}` → last sent ms */
  lastSent: Record<string, number>;
};

export type AlertEvent = {
  kind: AlertKind;
  ticker: string;
  timeframe: Timeframe;
  displayTicker: string;
  title: string;
  body: string;
};
