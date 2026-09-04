import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildWatchDigestLine,
  formatWatchDigestBody,
  formatWatchDigestTitle,
} from "./watch-digest-build.ts";
import type { AnalysisPayload } from "@/lib/market/types";

function payload(overrides: Partial<{ sampleNote: "ok" | "small" | "tiny"; dd: number }> = {}): AnalysisPayload {
  return {
    ticker: "BTCUSDT",
    displayTicker: "BTC/USDT",
    timeframe: "1h",
    fetchedAt: Date.now(),
    candleCount: 1500,
    snapshot: {
      last: { t: Date.now(), o: 0, h: 0, l: 0, c: 100_000, v: 0 },
      prev: null,
      rsi14: 55,
      sma20: 100,
      sma50: 100,
      sma200: null,
      distSma20Pct: 0,
      distSma50Pct: 0,
      high20: 100,
      low20: 100,
      near20High: false,
      near20Low: false,
      consecutive: 0,
      lastExtrema: null,
      changePct: 0,
      volLast: 100,
      volMedian20: 100,
      volRatio: 1,
    },
    precedent: {
      fingerprint: {
        rsiBucket: "50-60",
        vsSma20: "near",
        vsSma50: "near",
        extreme: "none",
        direction: "up",
      },
      fingerprintLabel: "",
      matches: 40,
      total: 100,
      relaxed: [],
      sampleNote: overrides.sampleNote ?? "ok",
      horizons: [
        {
          bars: 10,
          label: "10 barras",
          samples: 40,
          upPct: 50,
          downPct: 50,
          flatPct: 0,
          medianPct: 0,
          meanPct: 0,
          p10: -2,
          p90: 2,
          medianPath: [],
          medianDrawdownPct: overrides.dd ?? -1,
          worstDrawdownPct: -5,
          medianRunupPct: 3,
          baseline: { upPct: 50, medianPct: 0, medianDrawdownPct: -1 },
        },
      ],
      recentMatches: [],
      chartMatches: [],
    },
    chart: [],
    vision: null,
    visionError: null,
    source: "Binance",
    onchain: null,
    newsContext: null,
  };
}

test("buildWatchDigestLine marca amostra fraca", () => {
  const line = buildWatchDigestLine(payload({ sampleNote: "small" }), { ticker: "BTCUSDT", timeframe: "1h" }, 5);
  assert.ok(line.flags.some((f) => f.includes("amostra")));
});

test("buildWatchDigestLine sem flag quando estável", () => {
  const line = buildWatchDigestLine(payload({ sampleNote: "ok", dd: -1 }), { ticker: "BTCUSDT", timeframe: "1h" }, 5);
  assert.deepEqual(line.flags, ["sem flag de prevenção"]);
});

test("formatWatchDigestBody inclui disclaimer e não coaching", () => {
  const line = buildWatchDigestLine(payload({ sampleNote: "tiny" }), { ticker: "BTCUSDT", timeframe: "1h" }, 5);
  const body = formatWatchDigestBody([line], null);
  assert.match(body, /prevenção/);
  assert.match(body, /não é recomendação/);
  assert.doesNotMatch(body, /\b(compre|venda|entre|saia)\b/i);
  assert.match(formatWatchDigestTitle([line], false), /flag/);
});
