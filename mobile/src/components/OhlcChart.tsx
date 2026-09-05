import { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import type { ChartPoint, Timeframe } from "../types";
import type { ChartType } from "./ChartToolbar";
import { colors, radius } from "../theme";
import { formatPrice, formatWhen } from "../format";
import { hapticCrosshairTick } from "../haptics";

type Match = { t: number; score: number };

const HEIGHT = 260;
const MIN_VISIBLE = 8;
const FULL_MATCH_SCORE = 5;

function linePath(
  values: Array<number | null>,
  x: (i: number) => number,
  y: (v: number) => number,
): string {
  let d = "";
  let started = false;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) {
      started = false;
      continue;
    }
    d += `${started ? "L" : "M"} ${x(i).toFixed(2)} ${y(v).toFixed(2)} `;
    started = true;
  }
  return d.trim();
}

export function OhlcChart({
  data,
  matches,
  displayTicker: _displayTicker,
  timeframe: _timeframe,
  chartType = "candle",
  showSma20 = true,
  showSma50 = true,
}: {
  data: ChartPoint[];
  matches?: Match[];
  displayTicker?: string;
  timeframe?: Timeframe;
  chartType?: ChartType;
  showSma20?: boolean;
  showSma50?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const totalBars = data.length;

  const [windowStart, setWindowStart] = useState(0);
  const [windowCount, setWindowCount] = useState(totalBars);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const startShared = useSharedValue(0);
  const countShared = useSharedValue(totalBars);
  const pinchBaseCount = useSharedValue(totalBars);
  const pinchBaseStart = useSharedValue(0);
  const pinchFocalBar = useSharedValue(0);
  const pinchFocalFrac = useSharedValue(0.5);
  const panBaseStart = useSharedValue(0);
  const crosshairActive = useSharedValue(false);
  const crosshairX = useSharedValue(-1);
  const lastHoverIdx = useSharedValue(-1);

  useEffect(() => {
    startShared.value = 0;
    countShared.value = totalBars;
    setWindowStart(0);
    setWindowCount(totalBars);
    setHoverIndex(null);
    crosshairActive.value = false;
    crosshairX.value = -1;
    lastHoverIdx.value = -1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalBars]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const crosshairLineStyle = useAnimatedStyle(() => ({
    opacity: crosshairActive.value ? 1 : 0,
    transform: [{ translateX: crosshairX.value }],
  }));

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Sem candles para desenhar.</Text>
      </View>
    );
  }

  const chartW = Math.max(1, width);

  function syncWindow(start: number, count: number) {
    setWindowStart(start);
    setWindowCount(count);
  }

  function syncHover(idx: number | null) {
    setHoverIndex(idx);
  }

  function tickIfNew(idx: number) {
    hapticCrosshairTick();
    setHoverIndex(idx);
  }

  const pinch = Gesture.Pinch()
    .onStart((e: any) => {
      "worklet";
      pinchBaseCount.value = countShared.value;
      pinchBaseStart.value = startShared.value;
      const frac = Math.max(0, Math.min(1, e.focalX / chartW));
      pinchFocalFrac.value = frac;
      pinchFocalBar.value = pinchBaseStart.value + frac * pinchBaseCount.value;
    })
    .onUpdate((e: any) => {
      "worklet";
      const rawCount = pinchBaseCount.value / Math.max(0.1, e.scale);
      const clamped = Math.max(MIN_VISIBLE, Math.min(totalBars, Math.round(rawCount)));
      let newStart = Math.round(pinchFocalBar.value - pinchFocalFrac.value * clamped);
      newStart = Math.max(0, Math.min(totalBars - clamped, newStart));
      if (clamped !== countShared.value || newStart !== startShared.value) {
        countShared.value = clamped;
        startShared.value = newStart;
        runOnJS(syncWindow)(newStart, clamped);
      }
    });

  const panScroll = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .activeOffsetX([-10, 10])
    .onStart(() => {
      panBaseStart.value = startShared.value;
    })
    .onUpdate((e: any) => {
      "worklet";
      if (countShared.value >= totalBars) return;
      const barsPerPx = countShared.value / chartW;
      const deltaBars = Math.round(-e.translationX * barsPerPx);
      let newStart = panBaseStart.value + deltaBars;
      newStart = Math.max(0, Math.min(totalBars - countShared.value, newStart));
      if (newStart !== startShared.value) {
        startShared.value = newStart;
        runOnJS(syncWindow)(newStart, countShared.value);
      }
    });

  const crosshairLongPress = Gesture.LongPress()
    .minDuration(180)
    .onStart((e: any) => {
      "worklet";
      crosshairActive.value = true;
      crosshairX.value = e.x;
    })
    .onEnd(() => {
      "worklet";
      crosshairActive.value = false;
      crosshairX.value = -1;
      lastHoverIdx.value = -1;
      runOnJS(syncHover)(null);
    });

  const crosshairPan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onUpdate((e: any) => {
      "worklet";
      if (!crosshairActive.value) return;
      const clampedX = Math.max(0, Math.min(chartW, e.x));
      crosshairX.value = clampedX;
      const count = countShared.value;
      const idx =
        startShared.value + Math.max(0, Math.min(count - 1, Math.round((clampedX / chartW) * (count - 1))));
      if (idx !== lastHoverIdx.value) {
        lastHoverIdx.value = idx;
        runOnJS(tickIfNew)(idx);
      }
    })
    .onEnd(() => {
      "worklet";
      crosshairActive.value = false;
      crosshairX.value = -1;
      lastHoverIdx.value = -1;
      runOnJS(syncHover)(null);
    });

  const crosshairComposite = Gesture.Simultaneous(crosshairLongPress, crosshairPan);
  const rootGesture = Gesture.Race(pinch, Gesture.Exclusive(crosshairComposite, panScroll));

  const matchByTime = new Map<number, number>();
  for (const m of matches ?? []) matchByTime.set(m.t, m.score);

  const visibleData = data.slice(windowStart, windowStart + windowCount);

  let layout: {
    x: (i: number) => number;
    y: (v: number) => number;
    bodyW: number;
    sma20: string;
    sma50: string;
    closeLine: string;
    areaPath: string;
    bottomY: number;
  } | null = null;

  if (visibleData.length > 0 && width > 0) {
    const min = Math.min(...visibleData.map((d) => d.l));
    const max = Math.max(...visibleData.map((d) => d.h));
    const pad = (max - min) * 0.08 || 1;
    const yMin = min - pad;
    const yMax = max + pad;
    const left = 4;
    const right = 4;
    const top = 10;
    const bottom = 10;
    const innerW = Math.max(1, chartW - left - right);
    const innerH = HEIGHT - top - bottom;
    const slot = innerW / visibleData.length;
    const y = (v: number) => top + ((yMax - v) / (yMax - yMin)) * innerH;
    const x = (i: number) => left + slot * i + slot / 2;
    const bodyW = Math.max(1.2, slot * 0.55);
    const closeLine = linePath(visibleData.map((d) => d.c), x, y);
    const bottomY = top + innerH;
    let areaPath = closeLine;
    if (visibleData.length > 0) {
      areaPath += ` L ${x(visibleData.length - 1).toFixed(2)} ${bottomY} L ${x(0).toFixed(2)} ${bottomY} Z`;
    }
    layout = {
      x, y, bodyW,
      sma20: linePath(visibleData.map((d) => d.sma20), x, y),
      sma50: linePath(visibleData.map((d) => d.sma50), x, y),
      closeLine,
      areaPath,
      bottomY,
    };
  }

  const hovered = hoverIndex != null ? (data[hoverIndex] ?? null) : null;
  const zoomed = windowCount < totalBars;
  const last = data[data.length - 1]!;

  return (
    <View>
      <GestureDetector gesture={rootGesture}>
        <View onLayout={onLayout} style={{ height: HEIGHT }}>
          {layout && width > 0 ? (
            <Svg width={width} height={HEIGHT}>
              {chartType === "area" ? (
                <Defs>
                  <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={colors.accent} stopOpacity="0.25" />
                    <Stop offset="1" stopColor={colors.accent} stopOpacity="0.02" />
                  </LinearGradient>
                </Defs>
              ) : null}
              {showSma50 ? <Path d={layout.sma50} fill="none" stroke={colors.subtle} strokeWidth={1.2} /> : null}
              {showSma20 ? <Path d={layout.sma20} fill="none" stroke={colors.accent} strokeWidth={1.2} /> : null}
              {chartType === "candle" ? (
                visibleData.map((d, i) => {
                  const l = layout!;
                  const up = d.c >= d.o;
                  const color = up ? colors.up : colors.down;
                  const bodyTop = l.y(Math.max(d.o, d.c));
                  const bodyBot = l.y(Math.min(d.o, d.c));
                  const bh = Math.max(0.8, bodyBot - bodyTop);
                  const cx = l.x(i);
                  const score = matchByTime.get(d.t);
                  return (
                    <G key={d.t}>
                      <Line x1={cx} x2={cx} y1={l.y(d.h)} y2={l.y(d.l)} stroke={color} strokeWidth={1} />
                      <Rect
                        x={cx - l.bodyW / 2}
                        y={bodyTop}
                        width={l.bodyW}
                        height={bh}
                        fill={color}
                        rx={0.4}
                      />
                      {score != null ? (
                        <Circle
                          cx={cx}
                          cy={Math.max(4, l.y(d.h) - 6)}
                          r={2.4}
                          fill={score >= FULL_MATCH_SCORE ? colors.accent : colors.bg}
                          stroke={colors.accent}
                          strokeWidth={1}
                        />
                      ) : null}
                    </G>
                  );
                })
              ) : chartType === "area" ? (
                <>
                  <Path d={layout.areaPath} fill="url(#areaGrad)" />
                  <Path d={layout.closeLine} fill="none" stroke={colors.accent} strokeWidth={1.5} />
                  {visibleData.map((d, i) => {
                    const score = matchByTime.get(d.t);
                    if (score == null) return null;
                    return (
                      <Circle
                        key={d.t}
                        cx={layout!.x(i)}
                        cy={layout!.y(d.c)}
                        r={2.4}
                        fill={score >= FULL_MATCH_SCORE ? colors.accent : colors.bg}
                        stroke={colors.accent}
                        strokeWidth={1}
                      />
                    );
                  })}
                </>
              ) : (
                <>
                  <Path d={layout.closeLine} fill="none" stroke={colors.fg} strokeWidth={1.5} />
                  {visibleData.map((d, i) => {
                    const score = matchByTime.get(d.t);
                    if (score == null) return null;
                    return (
                      <Circle
                        key={d.t}
                        cx={layout!.x(i)}
                        cy={layout!.y(d.c)}
                        r={2.4}
                        fill={score >= FULL_MATCH_SCORE ? colors.accent : colors.bg}
                        stroke={colors.accent}
                        strokeWidth={1}
                      />
                    );
                  })}
                </>
              )}
            </Svg>
          ) : null}
          <Animated.View
            pointerEvents="none"
            style={[styles.crosshairLine, { height: HEIGHT }, crosshairLineStyle]}
          />
          {hovered ? (
            <View style={styles.readoutOverlay} pointerEvents="none">
              <Text style={styles.readoutTime}>{formatWhen(hovered.t)}</Text>
              <Text style={styles.readoutPrices}>
                O {formatPrice(hovered.o)}  H {formatPrice(hovered.h)}  L {formatPrice(hovered.l)}  C {formatPrice(hovered.c)}
              </Text>
            </View>
          ) : null}
        </View>
      </GestureDetector>
      <View style={styles.legendRow}>
        <View style={styles.legendGroup}>
          {showSma20 ? (
            <>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <Text style={styles.legendText}>SMA20</Text>
            </>
          ) : null}
          {showSma50 ? (
            <>
              <View style={[styles.dot, { backgroundColor: colors.subtle }]} />
              <Text style={styles.legendText}>SMA50</Text>
            </>
          ) : null}
          {matchByTime.size > 0 ? (
            <>
              <View style={[styles.dot, styles.ring, { borderColor: colors.accent }]} />
              <Text style={styles.legendText}>match</Text>
            </>
          ) : null}
        </View>
        <Text style={styles.price}>
          {zoomed ? `${windowCount}/${totalBars}` : formatPrice(last.c)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 13, color: colors.muted },
  crosshairLine: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 1,
    backgroundColor: colors.fg,
  },
  readoutOverlay: {
    position: "absolute",
    top: 6,
    left: 8,
    right: 8,
    backgroundColor: "rgba(12, 12, 10, 0.85)",
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  readoutTime: { fontSize: 10, color: colors.muted },
  readoutPrices: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.fg,
    fontVariant: ["tabular-nums"],
    marginTop: 1,
  },
  legendRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  legendGroup: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  ring: { borderWidth: 1, backgroundColor: "transparent" },
  legendText: { fontSize: 11, color: colors.muted, marginRight: 4 },
  price: { fontSize: 13, color: colors.fg, fontVariant: ["tabular-nums"] },
});
