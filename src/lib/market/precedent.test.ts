import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeSeries, dedupeOverlappingMatches } from "./precedent.ts";
import type { Candle, Timeframe } from "./types.ts";

const HOUR = 60 * 60 * 1000;

/**
 * Synthetic candles with a slow oscillation so the same RSI/SMA fingerprint
 * recurs many times — enough for `analyzeSeries` to find precedents without
 * hitting the network. Not meant to look like a real market, just to exercise
 * the matching + horizon math end to end with a known shape.
 */
function syntheticCandles(count: number): Candle[] {
  const out: Candle[] = [];
  let prevClose = 100;
  for (let i = 0; i < count; i++) {
    const close = 100 + 8 * Math.sin(i / 6) + (i % 7 === 0 ? 0.3 : 0);
    const open = prevClose;
    const high = Math.max(open, close) + 0.2;
    const low = Math.min(open, close) - 0.2;
    out.push({ t: i * HOUR, o: open, h: high, l: low, c: close, v: 1000 + i });
    prevClose = close;
  }
  return out;
}

const TF: Timeframe = "1h";

describe("analyzeSeries — input guards", () => {
  it("refuses a history shorter than 80 candles", () => {
    assert.throws(() => analyzeSeries(syntheticCandles(50), TF), /Histórico insuficiente/);
  });
});

describe("analyzeSeries — shape and invariants", () => {
  const candles = syntheticCandles(300);
  const { snapshot, precedent, chart } = analyzeSeries(candles, TF);

  it("builds one horizon per configured bar count, each with the full path length", () => {
    assert.deepEqual(
      precedent.horizons.map((h) => h.bars),
      [5, 10, 20],
    );
    for (const h of precedent.horizons) {
      assert.equal(h.medianPath.length, h.bars);
    }
  });

  it("every horizon shares the same sample count as the top-level match count", () => {
    // Every candidate that clears the fingerprint score threshold is within
    // the 20-bar max horizon, so none of the 3 horizons should drop matches.
    for (const h of precedent.horizons) {
      assert.equal(h.samples, precedent.matches);
    }
  });

  it("sampleNote follows the documented thresholds off the real match count", () => {
    if (precedent.matches < 8) assert.equal(precedent.sampleNote, "tiny");
    else if (precedent.matches < 20) assert.equal(precedent.sampleNote, "small");
    else assert.equal(precedent.sampleNote, "ok");
  });

  it("the worst drawdown is never better than the median drawdown", () => {
    for (const h of precedent.horizons) {
      if (h.samples === 0) continue;
      assert.ok(
        h.worstDrawdownPct <= h.medianDrawdownPct + 1e-9,
        `worst ${h.worstDrawdownPct} should be <= median ${h.medianDrawdownPct}`,
      );
    }
  });

  it("up/down/flat split of a horizon always sums to ~100%", () => {
    for (const h of precedent.horizons) {
      if (h.samples === 0) continue;
      assert.ok(Math.abs(h.upPct + h.downPct + h.flatPct - 100) < 1e-6);
    }
  });

  it("fingerprint fields are within their known domains", () => {
    assert.match(precedent.fingerprint.rsiBucket, /^\d+-\d+$/);
    assert.ok(["above", "below", "near"].includes(precedent.fingerprint.vsSma20));
    assert.ok(["above", "below", "near"].includes(precedent.fingerprint.vsSma50));
    assert.ok(["high20", "low20", "none"].includes(precedent.fingerprint.extreme));
    assert.ok(["up", "down"].includes(precedent.fingerprint.direction));
  });

  it("recentMatches is capped at 6 and sorted most-recent-first", () => {
    assert.ok(precedent.recentMatches.length <= 6);
    for (let i = 1; i < precedent.recentMatches.length; i++) {
      assert.ok(precedent.recentMatches[i - 1]!.t >= precedent.recentMatches[i]!.t);
    }
  });

  it("ENG-01: no two counted matches are within the max horizon of each other", () => {
    // Overlapping matches share almost the entire forward path — they are not
    // independent observations. maxHorizon is the largest configured horizon (20).
    const maxHorizonMs = 20 * HOUR;
    for (let i = 1; i < precedent.recentMatches.length; i++) {
      // sorted most-recent-first, so the previous entry is the larger timestamp.
      const gap = precedent.recentMatches[i - 1]!.t - precedent.recentMatches[i]!.t;
      assert.ok(
        gap >= maxHorizonMs,
        `matches at ${precedent.recentMatches[i - 1]!.t} and ${precedent.recentMatches[i]!.t} are only ${gap / HOUR} bars apart`,
      );
    }
  });

  it("chartMatches only contains timestamps that are actually in the visible chart window", () => {
    const chartTimes = new Set(chart.map((c) => c.t));
    for (const m of precedent.chartMatches) {
      assert.ok(chartTimes.has(m.t), `chart match ${m.t} is outside the drawn chart window`);
    }
  });

  it("the chart window is at most the last 120 candles", () => {
    assert.ok(chart.length <= 120);
    assert.equal(chart.length, Math.min(120, candles.length));
  });

  it("snapshot RSI is a finite value inside [0, 100]", () => {
    assert.ok(Number.isFinite(snapshot.rsi14));
    assert.ok(snapshot.rsi14 >= 0 && snapshot.rsi14 <= 100);
  });

  it("near20High and near20Low are never both true", () => {
    assert.ok(!(snapshot.near20High && snapshot.near20Low));
  });
});

describe("dedupeOverlappingMatches — ENG-01", () => {
  it("20 consecutive candidate indices (identical/overlapping candles) collapse to at most floor(20/maxHorizon)", () => {
    const maxHorizon = 20;
    const twentyConsecutive = Array.from({ length: 20 }, (_, i) => ({ i, score: 5 }));
    const kept = dedupeOverlappingMatches(twentyConsecutive, maxHorizon);
    assert.ok(kept.length <= Math.floor(20 / maxHorizon));
    assert.equal(kept.length, 1);
  });

  it("keeps matches that are already spaced at least minGap apart", () => {
    const spaced = [
      { i: 0, score: 5 },
      { i: 20, score: 5 },
      { i: 40, score: 5 },
    ];
    assert.deepEqual(dedupeOverlappingMatches(spaced, 20), spaced);
  });

  it("keeps the earliest match in each overlapping cluster, greedily", () => {
    const clustered = [
      { i: 0, score: 5 },
      { i: 5, score: 5 }, // within 20 of i=0 — dropped
      { i: 25, score: 5 }, // 25 - 0 = 25 >= 20 — kept, resets the window
      { i: 30, score: 5 }, // within 20 of i=25 — dropped
    ];
    assert.deepEqual(dedupeOverlappingMatches(clustered, 20), [
      { i: 0, score: 5 },
      { i: 25, score: 5 },
    ]);
  });
});

describe("analyzeSeries — degenerate but valid input", () => {
  it("handles a flat series (constant price) without throwing or producing NaN", () => {
    const flat: Candle[] = Array.from({ length: 120 }, (_, i) => ({
      t: i * HOUR,
      o: 100,
      h: 100,
      l: 100,
      c: 100,
      v: 1,
    }));
    const { snapshot, precedent } = analyzeSeries(flat, TF);
    assert.ok(Number.isFinite(snapshot.rsi14));
    assert.ok(Number.isFinite(snapshot.distSma20Pct));
    for (const h of precedent.horizons) {
      assert.ok(Number.isFinite(h.medianPct));
      assert.ok(Number.isFinite(h.medianDrawdownPct));
    }
  });
});
