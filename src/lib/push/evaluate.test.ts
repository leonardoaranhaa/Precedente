import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateAlerts } from "./evaluate.ts";
import type { AnalysisPayload } from "@/lib/market/types";
import type { AlertRules } from "./types.ts";

const RULES_OFF: AlertRules = {
  sampleWeak: false,
  drawdownPath: false,
  drawdownThresholdPct: 5,
  extreme20: false,
};

function payload(overrides: { price?: number; rsi?: number } = {}): AnalysisPayload {
  return {
    ticker: "BTCUSDT",
    displayTicker: "BTC/USDT",
    timeframe: "1h",
    fetchedAt: Date.now(),
    candleCount: 1500,
    snapshot: {
      last: { t: Date.now(), o: 0, h: 0, l: 0, c: overrides.price ?? 100, v: 0 },
      prev: null,
      rsi14: overrides.rsi ?? 50,
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
    },
    precedent: {
      fingerprint: {
        rsiBucket: "40-50",
        vsSma20: "near",
        vsSma50: "near",
        extreme: "none",
        direction: "up",
      },
      fingerprintLabel: "",
      matches: 20,
      total: 100,
      relaxed: [],
      sampleNote: "ok",
      horizons: [],
      recentMatches: [],
      chartMatches: [],
    },
    chart: [],
    vision: null,
    visionError: null,
    source: "Binance",
    onchain: null,
  };
}

describe("evaluateAlerts — price_zone", () => {
  it("fires when the close is inside a min/max range", () => {
    const events = evaluateAlerts(
      payload({ price: 95_500 }),
      { priceZone: { enabled: true, min: 95_000, max: 96_000 } },
      RULES_OFF,
      {},
    );
    assert.equal(events.length, 1);
    assert.equal(events[0]!.kind, "price_zone");
  });

  it("does not fire when the close is outside the range", () => {
    const events = evaluateAlerts(
      payload({ price: 94_000 }),
      { priceZone: { enabled: true, min: 95_000, max: 96_000 } },
      RULES_OFF,
      {},
    );
    assert.equal(events.length, 0);
  });

  it("supports an open-ended zone (min only, no max)", () => {
    const events = evaluateAlerts(
      payload({ price: 200_000 }),
      { priceZone: { enabled: true, min: 100_000, max: null } },
      RULES_OFF,
      {},
    );
    assert.equal(events.length, 1);
  });

  it("respects the cooldown — same kind/pair does not fire twice within the window", () => {
    const lastSent = { "BTCUSDT:1h:price_zone": Date.now() };
    const events = evaluateAlerts(
      payload({ price: 95_500 }),
      { priceZone: { enabled: true, min: 95_000, max: 96_000 } },
      RULES_OFF,
      lastSent,
    );
    assert.equal(events.length, 0);
  });

  it("disabled zone never fires even inside range", () => {
    const events = evaluateAlerts(
      payload({ price: 95_500 }),
      { priceZone: { enabled: false, min: 95_000, max: 96_000 } },
      RULES_OFF,
      {},
    );
    assert.equal(events.length, 0);
  });
});

describe("evaluateAlerts — rsi_zone", () => {
  it("fires when RSI drops at or below the configured floor", () => {
    const events = evaluateAlerts(
      payload({ rsi: 25 }),
      { rsiZone: { enabled: true, below: 30, above: null } },
      RULES_OFF,
      {},
    );
    assert.equal(events.length, 1);
    assert.equal(events[0]!.kind, "rsi_zone");
  });

  it("fires when RSI rises at or above the configured ceiling", () => {
    const events = evaluateAlerts(
      payload({ rsi: 75 }),
      { rsiZone: { enabled: true, below: null, above: 70 } },
      RULES_OFF,
      {},
    );
    assert.equal(events.length, 1);
  });

  it("does not fire while RSI sits between both limits", () => {
    const events = evaluateAlerts(
      payload({ rsi: 50 }),
      { rsiZone: { enabled: true, below: 30, above: 70 } },
      RULES_OFF,
      {},
    );
    assert.equal(events.length, 0);
  });
});

describe("evaluateAlerts — zones alongside the existing global rules", () => {
  it("a pair with no zone configured only evaluates the global rules", () => {
    const events = evaluateAlerts(payload({ price: 95_500 }), {}, RULES_OFF, {});
    assert.equal(events.length, 0);
  });
});
