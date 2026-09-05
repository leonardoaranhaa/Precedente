import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import Svg, { G, Line, Path, Rect } from "react-native-svg";
import { X } from "lucide-react-native";
import type { ChartPoint } from "../types";
import { colors, radius } from "../theme";
import { formatPrice, formatWhen } from "../format";
import { hapticCrosshairTick } from "../haptics";

type Match = { t: number; score: number };

const MIN_VISIBLE = 8;
const FULL_MATCH_SCORE = 5;
const HEIGHT_RATIO = 0.5;

type Props = {
  visible: boolean;
  onClose: () => void;
  data: ChartPoint[];
  matches?: Match[];
  displayTicker: string;
  timeframeLabel: string;
};

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

/**
 * Gráfico ampliado com pinch-zoom, pan (quando com zoom) e crosshair
 * (aperta e segura, depois arrasta — mesmo padrão de apps de corretora).
 * Zoom/pan recalculam a janela de barras via runOnJS a cada mudança
 * inteira (não a cada frame) — o SVG em si não é animado, só a linha do
 * crosshair, que precisa acompanhar o dedo de verdade.
 */
export function OhlcChartModal({
  visible,
  onClose,
  data,
  matches,
  displayTicker,
  timeframeLabel,
}: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const chartW = Math.max(1, screenW - 32);
  const chartH = Math.round(screenH * HEIGHT_RATIO);
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
    if (!visible) return;
    startShared.value = 0;
    countShared.value = totalBars;
    setWindowStart(0);
    setWindowCount(totalBars);
    setHoverIndex(null);
    crosshairActive.value = false;
    crosshairX.value = -1;
    lastHoverIdx.value = -1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, totalBars]);

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
    // Só ativa depois de mover de verdade — sem isso ele reconhece antes do
    // LongPress do crosshair completar seu minDuration e sempre vence a
    // corrida do Gesture.Exclusive, mesmo quando o dedo fica parado primeiro.
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

  const crosshairLineStyle = useAnimatedStyle(() => ({
    opacity: crosshairActive.value ? 1 : 0,
    transform: [{ translateX: crosshairX.value }],
  }));

  if (!visible) return null;

  const visibleData = data.slice(windowStart, windowStart + windowCount);
  const matchByTime = new Map<number, number>();
  for (const m of matches ?? []) matchByTime.set(m.t, m.score);

  let layout: {
    x: (i: number) => number;
    y: (v: number) => number;
    bodyW: number;
    sma20: string;
    sma50: string;
  } | null = null;

  if (visibleData.length > 0) {
    const min = Math.min(...visibleData.map((d) => d.l));
    const max = Math.max(...visibleData.map((d) => d.h));
    const pad = (max - min) * 0.08 || 1;
    const yMin = min - pad;
    const yMax = max + pad;
    const left = 4;
    const right = 4;
    const top = 12;
    const bottom = 12;
    const innerW = Math.max(1, chartW - left - right);
    const innerH = chartH - top - bottom;
    const slot = innerW / visibleData.length;
    const y = (v: number) => top + ((yMax - v) / (yMax - yMin)) * innerH;
    const x = (i: number) => left + slot * i + slot / 2;
    const bodyW = Math.max(1.5, slot * 0.6);
    layout = {
      x,
      y,
      bodyW,
      sma20: linePath(
        visibleData.map((d) => d.sma20),
        x,
        y,
      ),
      sma50: linePath(
        visibleData.map((d) => d.sma50),
        x,
        y,
      ),
    };
  }

  const hovered =
    hoverIndex != null ? (data[hoverIndex] ?? null) : null;
  const zoomed = windowCount < totalBars;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.sheet}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{displayTicker}</Text>
            <Text style={styles.subtitle}>
              {timeframeLabel} · {zoomed ? `${windowCount} de ${totalBars} barras` : `${totalBars} barras`}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <X size={20} color={colors.fg} />
          </Pressable>
        </View>

        <Text style={styles.hint}>
          Pinça pra dar zoom · arrasta pra rolar (com zoom) · aperta e segura pra ver o valor exato
        </Text>

        <GestureDetector gesture={rootGesture}>
          <View style={{ width: chartW, height: chartH, alignSelf: "center" }}>
            {layout && visibleData.length > 0 ? (
              <Svg width={chartW} height={chartH}>
                <Path d={layout.sma50} fill="none" stroke={colors.subtle} strokeWidth={1.4} />
                <Path d={layout.sma20} fill="none" stroke={colors.accent} strokeWidth={1.4} />
                {visibleData.map((d, i) => {
                  const l = layout!;
                  const up = d.c >= d.o;
                  const color = up ? colors.up : colors.down;
                  const bodyTop = l.y(Math.max(d.o, d.c));
                  const bodyBot = l.y(Math.min(d.o, d.c));
                  const bh = Math.max(1, bodyBot - bodyTop);
                  const cx = l.x(i);
                  const score = matchByTime.get(d.t);
                  return (
                    <G key={d.t}>
                      <Line x1={cx} x2={cx} y1={l.y(d.h)} y2={l.y(d.l)} stroke={color} strokeWidth={1.2} />
                      <Rect
                        x={cx - l.bodyW / 2}
                        y={bodyTop}
                        width={l.bodyW}
                        height={bh}
                        fill={color}
                        rx={0.6}
                      />
                      {score != null ? (
                        <Rect
                          x={cx - 1.5}
                          y={Math.max(2, l.y(d.h) - 8)}
                          width={3}
                          height={3}
                          fill={score >= FULL_MATCH_SCORE ? colors.accent : colors.bg}
                          stroke={colors.accent}
                          strokeWidth={0.8}
                        />
                      ) : null}
                    </G>
                  );
                })}
              </Svg>
            ) : null}
            <Animated.View
              pointerEvents="none"
              style={[styles.crosshairLine, { height: chartH }, crosshairLineStyle]}
            />
          </View>
        </GestureDetector>

        <View style={styles.readout}>
          {hovered ? (
            <>
              <Text style={styles.readoutTime}>{formatWhen(hovered.t)}</Text>
              <View style={styles.readoutRow}>
                <ReadoutItem label="Abertura" value={formatPrice(hovered.o)} />
                <ReadoutItem label="Máxima" value={formatPrice(hovered.h)} />
                <ReadoutItem label="Mínima" value={formatPrice(hovered.l)} />
                <ReadoutItem label="Fechamento" value={formatPrice(hovered.c)} />
              </View>
            </>
          ) : (
            <Text style={styles.readoutIdle}>
              Último: {formatPrice(data[data.length - 1]?.c ?? 0)}
            </Text>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ReadoutItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readoutItem}>
      <Text style={styles.readoutLabel}>{label}</Text>
      <Text style={styles.readoutValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg, paddingTop: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.fg },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 2, fontVariant: ["tabular-nums"] },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontSize: 11,
    color: colors.subtle,
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  crosshairLine: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 1,
    backgroundColor: colors.fg,
  },
  readout: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 56,
    justifyContent: "center",
  },
  readoutTime: { fontSize: 11, color: colors.muted, marginBottom: 6 },
  readoutRow: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  readoutItem: { gap: 2 },
  readoutLabel: { fontSize: 10, color: colors.subtle, textTransform: "uppercase" },
  readoutValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.fg,
    fontVariant: ["tabular-nums"],
  },
  readoutIdle: { fontSize: 14, color: colors.fg, fontVariant: ["tabular-nums"] },
});
