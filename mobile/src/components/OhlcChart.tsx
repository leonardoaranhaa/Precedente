import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import type { ChartPoint } from "../types";
import { colors } from "../theme";
import { formatPrice } from "../format";

type Match = { t: number; score: number };

const HEIGHT = 200;
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

/** Espelha web/src/components/ohlc-chart.tsx — mesmos marcadores de match. */
export function OhlcChart({ data, matches }: { data: ChartPoint[]; matches?: Match[] }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Sem candles para desenhar.</Text>
      </View>
    );
  }

  const matchByTime = new Map<number, number>();
  for (const m of matches ?? []) matchByTime.set(m.t, m.score);

  const min = Math.min(...data.map((d) => d.l));
  const max = Math.max(...data.map((d) => d.h));
  const pad = (max - min) * 0.08 || 1;
  const yMin = min - pad;
  const yMax = max + pad;
  const left = 4;
  const right = 4;
  const top = 8;
  const bottom = 8;
  const innerW = Math.max(1, width - left - right);
  const innerH = HEIGHT - top - bottom;
  const slot = innerW / data.length;
  const y = (v: number) => top + ((yMax - v) / (yMax - yMin)) * innerH;
  const x = (i: number) => left + slot * i + slot / 2;
  const bodyW = Math.max(1.2, slot * 0.55);

  const sma20 = linePath(
    data.map((d) => d.sma20),
    x,
    y,
  );
  const sma50 = linePath(
    data.map((d) => d.sma50),
    x,
    y,
  );
  const last = data[data.length - 1]!;

  return (
    <View>
      <View onLayout={onLayout} style={{ height: HEIGHT }}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            <Path d={sma50} fill="none" stroke={colors.subtle} strokeWidth={1.2} />
            <Path d={sma20} fill="none" stroke={colors.accent} strokeWidth={1.2} />
            {data.map((d, i) => {
              const up = d.c >= d.o;
              const color = up ? colors.up : colors.down;
              const bodyTop = y(Math.max(d.o, d.c));
              const bodyBot = y(Math.min(d.o, d.c));
              const bh = Math.max(0.8, bodyBot - bodyTop);
              const cx = x(i);
              const score = matchByTime.get(d.t);
              return (
                <G key={d.t}>
                  <Line x1={cx} x2={cx} y1={y(d.h)} y2={y(d.l)} stroke={color} strokeWidth={1} />
                  <Rect
                    x={cx - bodyW / 2}
                    y={bodyTop}
                    width={bodyW}
                    height={bh}
                    fill={color}
                    rx={0.4}
                  />
                  {score != null ? (
                    <Circle
                      cx={cx}
                      cy={Math.max(4, y(d.h) - 6)}
                      r={2.4}
                      fill={score >= FULL_MATCH_SCORE ? colors.accent : colors.bg}
                      stroke={colors.accent}
                      strokeWidth={1}
                    />
                  ) : null}
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>
      <View style={styles.legendRow}>
        <View style={styles.legendGroup}>
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendText}>SMA20</Text>
          <View style={[styles.dot, { backgroundColor: colors.subtle }]} />
          <Text style={styles.legendText}>SMA50</Text>
          {matchByTime.size > 0 ? (
            <>
              <View style={[styles.dot, styles.ring, { borderColor: colors.accent }]} />
              <Text style={styles.legendText}>match</Text>
              <View
                style={[
                  styles.dot,
                  styles.ring,
                  { borderColor: colors.accent, backgroundColor: colors.bg },
                ]}
              />
              <Text style={styles.legendText}>relaxado</Text>
            </>
          ) : null}
        </View>
        <Text style={styles.price}>{formatPrice(last.c)}</Text>
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
  legendRow: {
    marginTop: 8,
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
