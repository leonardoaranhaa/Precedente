import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analysisSummaryText } from "./export-analysis.ts";
import type { StoredAnalysis } from "./market/types.ts";

const candle = { t: 0, o: 100000, h: 101000, l: 99000, c: 100500, v: 500 };

const stub = {
  id: "test-1",
  ticker: "BTCUSDT",
  displayTicker: "BTCUSDT",
  timeframe: "4h" as const,
  source: "binance",
  candleCount: 120,
  ts: Date.now(),
  fetchedAt: Date.now(),
  chart: [],
  snapshot: {
    last: candle,
    prev: null,
    changePct: 0.005,
    rsi14: 55.3,
    sma20: 99000,
    sma50: 97000,
    sma200: 90000,
    distSma20Pct: 0.015,
    distSma50Pct: 0.036,
    high20: 101000,
    low20: 98000,
    near20High: false,
    near20Low: false,
    consecutive: 2,
    lastExtrema: null,
    volLast: 500,
    volMedian20: 400,
    volRatio: 1.25,
  },
  precedent: {
    matches: 42,
    total: 1000,
    relaxed: [],
    sampleNote: "ok" as const,
    fingerprint: {
      rsiBucket: "50-60",
      direction: "up" as const,
      vsSma20: "above" as const,
      vsSma50: "above" as const,
      extreme: "none" as const,
    },
    fingerprintLabel: "RSI neutro, acima das médias",
    horizons: [
      {
        bars: 5,
        label: "5 barras (20h)",
        samples: 42,
        upPct: 0.6,
        flatPct: 0.1,
        downPct: 0.3,
        medianPct: 0.012,
        meanPct: 0.015,
        p10: -0.02,
        p90: 0.04,
        medianDrawdownPct: -0.008,
        worstDrawdownPct: -0.035,
        medianRunupPct: 0.018,
        medianPath: [],
        baseline: { upPct: 0.5, medianPct: 0.001, medianDrawdownPct: -0.01 },
      },
      {
        bars: 10,
        label: "10 barras (40h)",
        samples: 42,
        upPct: 0.55,
        flatPct: 0.15,
        downPct: 0.3,
        medianPct: 0.01,
        meanPct: 0.013,
        p10: -0.03,
        p90: 0.05,
        medianDrawdownPct: -0.015,
        worstDrawdownPct: -0.06,
        medianRunupPct: 0.025,
        medianPath: [],
        baseline: { upPct: 0.5, medianPct: 0.001, medianDrawdownPct: -0.015 },
      },
    ],
    chartMatches: [],
    recentMatches: [],
  },
  vision: null,
  visionError: null,
  onchain: null,
  newsContext: null,
} as unknown as StoredAnalysis;

describe("analysisSummaryText", () => {
  it("includes ticker, timeframe and horizons", () => {
    const text = analysisSummaryText(stub);
    assert.ok(text.includes("BTCUSDT"));
    assert.ok(text.includes("4 horas"));
    assert.ok(text.includes("n=42"));
    assert.ok(text.includes("via Precedente"));
  });

  it("includes funding when available", () => {
    const withOnchain = {
      ...stub,
      onchain: {
        fetchedAt: Date.now(),
        fundingRate: 0.0003,
        markPrice: null,
        openInterest: null,
        openInterestDelta24hPct: null,
        liquidityUsd: null,
        sources: ["binance"],
      },
    } as unknown as StoredAnalysis;
    const text = analysisSummaryText(withOnchain);
    assert.ok(text.includes("Funding"));
    assert.ok(text.includes("0.030%"));
  });

  it("omits funding when not available", () => {
    const text = analysisSummaryText(stub);
    assert.ok(!text.includes("Funding"));
  });
});
