import {
  consecutiveDirection,
  lastSwing,
  median,
  percentile,
  rollingHigh,
  rollingLow,
  rsi,
  sma,
} from "./indicators";
import { fingerprintLabel, horizonCaption } from "./labels";
import type {
  Candle,
  ChartPoint,
  Extreme,
  Fingerprint,
  HorizonOutcome,
  MaSide,
  PrecedentResult,
  Snapshot,
  Timeframe,
} from "./types";

const HORIZONS = [5, 10, 20] as const;
const CHART_BARS = 120;

function rsiBucket(value: number): string {
  if (value < 20) return "0-20";
  if (value < 30) return "20-30";
  if (value < 40) return "30-40";
  if (value < 50) return "40-50";
  if (value < 60) return "50-60";
  if (value < 70) return "60-70";
  if (value < 80) return "70-80";
  return "80-100";
}

function vsMa(price: number, ma: number): MaSide {
  const pct = (price - ma) / ma;
  if (Math.abs(pct) < 0.004) return "near";
  return pct > 0 ? "above" : "below";
}

function extremeOf(price: number, high20: number, low20: number): Extreme {
  if (high20 > 0 && (high20 - price) / high20 <= 0.005) return "high20";
  if (low20 > 0 && (price - low20) / low20 <= 0.005) return "low20";
  return "none";
}

function flatThreshold(tf: Timeframe): number {
  switch (tf) {
    case "15m":
      return 0.15;
    case "1h":
      return 0.25;
    case "4h":
      return 0.4;
    case "1d":
      return 0.6;
  }
}

function fingerprintAt(
  i: number,
  closes: number[],
  rsiArr: Array<number | null>,
  sma20: Array<number | null>,
  sma50: Array<number | null>,
  high20: Array<number | null>,
  low20: Array<number | null>,
  candles: Candle[],
): Fingerprint | null {
  const r = rsiArr[i];
  const s20 = sma20[i];
  const s50 = sma50[i];
  const h20 = high20[i];
  const l20 = low20[i];
  const close = closes[i];
  const candle = candles[i];
  if (
    r == null ||
    s20 == null ||
    s50 == null ||
    h20 == null ||
    l20 == null ||
    close == null ||
    candle == null
  ) {
    return null;
  }
  return {
    rsiBucket: rsiBucket(r),
    vsSma20: vsMa(close, s20),
    vsSma50: vsMa(close, s50),
    extreme: extremeOf(close, h20, l20),
    direction: candle.c >= candle.o ? "up" : "down",
  };
}

function sameCore(a: Fingerprint, b: Fingerprint): boolean {
  return a.rsiBucket === b.rsiBucket && a.direction === b.direction;
}

function scoreMatch(target: Fingerprint, candidate: Fingerprint): number {
  if (!sameCore(target, candidate)) return 0;
  let score = 2;
  if (candidate.vsSma20 === target.vsSma20) score += 1;
  if (candidate.vsSma50 === target.vsSma50) score += 1;
  if (candidate.extreme === target.extreme) score += 1;
  return score;
}

function buildHorizon(
  tf: Timeframe,
  bars: number,
  matchIdx: number[],
  closes: number[],
  lows: number[],
  highs: number[],
): HorizonOutcome {
  const flat = flatThreshold(tf);
  const returns: number[] = [];
  const paths: number[][] = [];
  const drawdowns: number[] = [];
  const runups: number[] = [];

  for (const i of matchIdx) {
    if (i + bars >= closes.length) continue;
    const base = closes[i]!;
    if (base <= 0) continue;
    const fwd = ((closes[i + bars]! - base) / base) * 100;
    returns.push(fwd);
    const path: number[] = [];
    let lowest = Infinity;
    let highest = -Infinity;
    for (let k = 1; k <= bars; k++) {
      path.push(((closes[i + k]! - base) / base) * 100);
      lowest = Math.min(lowest, lows[i + k]!);
      highest = Math.max(highest, highs[i + k]!);
    }
    paths.push(path);
    // Excursão máxima contra e a favor, medida na mínima/máxima do caminho.
    if (Number.isFinite(lowest)) drawdowns.push(((lowest - base) / base) * 100);
    if (Number.isFinite(highest)) runups.push(((highest - base) / base) * 100);
  }

  const up = returns.filter((r) => r > flat).length;
  const down = returns.filter((r) => r < -flat).length;
  const n = returns.length;
  const flatN = n - up - down;

  const medianPath: number[] = [];
  for (let k = 0; k < bars; k++) {
    const col = paths.map((p) => p[k]!).filter((v) => Number.isFinite(v));
    medianPath.push(median(col));
  }

  return {
    bars,
    label: horizonCaption(tf, bars),
    samples: n,
    upPct: n ? (up / n) * 100 : 0,
    downPct: n ? (down / n) * 100 : 0,
    flatPct: n ? (flatN / n) * 100 : 0,
    medianPct: median(returns),
    meanPct: n ? returns.reduce((a, b) => a + b, 0) / n : 0,
    p10: percentile(returns, 0.1),
    p90: percentile(returns, 0.9),
    medianPath,
    medianDrawdownPct: median(drawdowns),
    worstDrawdownPct: drawdowns.length ? Math.min(...drawdowns) : 0,
    medianRunupPct: median(runups),
  };
}

export function analyzeSeries(
  candles: Candle[],
  timeframe: Timeframe,
): {
  snapshot: Snapshot;
  precedent: PrecedentResult;
  chart: ChartPoint[];
} {
  if (candles.length < 80) {
    throw new Error("Histórico insuficiente para estatística — tente outro par ou um tempo gráfico maior.");
  }

  const closes = candles.map((c) => c.c);
  const highs = candles.map((c) => c.h);
  const lows = candles.map((c) => c.l);
  const rsiArr = rsi(closes, 14);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const high20 = rollingHigh(highs, 20);
  const low20 = rollingLow(lows, 20);

  const last = candles.length - 1;
  const target = fingerprintAt(last, closes, rsiArr, sma20, sma50, high20, low20, candles);
  if (!target) {
    throw new Error("Ainda não há indicadores suficientes neste histórico.");
  }

  const maxHorizon = HORIZONS[HORIZONS.length - 1]!;
  const candidates: { i: number; score: number }[] = [];
  for (let i = 50; i < last - maxHorizon; i++) {
    const fp = fingerprintAt(i, closes, rsiArr, sma20, sma50, high20, low20, candles);
    if (!fp) continue;
    const score = scoreMatch(target, fp);
    if (score >= 2) candidates.push({ i, score });
  }

  let used = candidates.filter((c) => c.score >= 5);
  const relaxed: string[] = [];
  if (used.length < 12) {
    used = candidates.filter((c) => c.score >= 4);
    if (used.length >= 12) relaxed.push("extrema de 20 barras");
  }
  if (used.length < 12) {
    used = candidates.filter((c) => c.score >= 3);
    if (used.length >= 12) relaxed.push("posição vs SMA50");
  }
  if (used.length < 12) {
    used = candidates.filter((c) => c.score >= 2);
    if (candidates.length) relaxed.push("posição vs SMA20");
  }

  const matchIdx = used.map((c) => c.i);
  const horizons = HORIZONS.map((h) =>
    buildHorizon(timeframe, h, matchIdx, closes, lows, highs),
  );

  let sampleNote: PrecedentResult["sampleNote"] = "ok";
  if (matchIdx.length < 8) sampleNote = "tiny";
  else if (matchIdx.length < 20) sampleNote = "small";

  const lastHorizon = horizons[horizons.length - 1]!;
  const recentMatches = [...used]
    .sort((a, b) => b.i - a.i)
    .slice(0, 6)
    .map(({ i, score }) => {
      const fwdIdx = Math.min(i + lastHorizon.bars, candles.length - 1);
      const base = closes[i]!;
      return {
        t: candles[i]!.t,
        forward: base > 0 ? ((closes[fwdIdx]! - base) / base) * 100 : 0,
        // >=5 = todos os critérios bateram; abaixo disso, o match só entrou
        // porque algum critério foi relaxado (ver `relaxed` acima).
        score,
      };
    });

  const lastCandle = candles[last]!;
  const prev = last > 0 ? candles[last - 1]! : null;
  const s20 = sma20[last]!;
  const s50 = sma50[last]!;
  const h20 = high20[last]!;
  const l20 = low20[last]!;
  const r = rsiArr[last]!;

  const snapshot: Snapshot = {
    last: lastCandle,
    prev,
    rsi14: r,
    sma20: s20,
    sma50: s50,
    sma200: sma200[last],
    distSma20Pct: ((lastCandle.c - s20) / s20) * 100,
    distSma50Pct: ((lastCandle.c - s50) / s50) * 100,
    high20: h20,
    low20: l20,
    near20High: target.extreme === "high20",
    near20Low: target.extreme === "low20",
    consecutive: consecutiveDirection(candles, last),
    lastExtrema: lastSwing(candles, last),
    changePct: prev ? ((lastCandle.c - prev.c) / prev.c) * 100 : 0,
  };

  const from = Math.max(0, candles.length - CHART_BARS);
  const chart: ChartPoint[] = candles.slice(from).map((c, idx) => {
    const i = from + idx;
    return {
      t: c.t,
      o: c.o,
      h: c.h,
      l: c.l,
      c: c.c,
      sma20: sma20[i],
      sma50: sma50[i],
    };
  });

  // `recentMatches` (a tape) is the N most recent occurrences regardless of
  // how far back they are; the chart only draws the last CHART_BARS candles.
  // Those two windows rarely overlap — a fingerprint that recurs every ~15
  // bars can easily have zero of its 6 most recent hits inside a 120-bar
  // chart. Marking matches on the chart needs its own set, scoped to what
  // the chart actually shows.
  const chartMatches = used
    .filter((c) => c.i >= from)
    .map(({ i, score }) => ({ t: candles[i]!.t, score }));

  return {
    snapshot,
    chart,
    precedent: {
      fingerprint: target,
      fingerprintLabel: fingerprintLabel(target),
      matches: matchIdx.length,
      total: last - maxHorizon - 50,
      relaxed,
      sampleNote,
      horizons,
      recentMatches,
      chartMatches,
    },
  };
}
