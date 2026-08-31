import type { Timeframe } from "@/lib/market/types";

export type AlertKind = "sample_weak" | "drawdown_path" | "extreme_20";

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

export type WatchTarget = {
  ticker: string;
  timeframe: Timeframe;
  displayTicker?: string;
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
