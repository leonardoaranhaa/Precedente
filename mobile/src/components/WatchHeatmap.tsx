import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../theme";
import { formatPct, timeframeLabel } from "../format";
import { isFragile } from "../watch-filters";
import type { WatchItem } from "../watchlist";

function intensity(changePct: number): number {
  const clamped = Math.min(Math.abs(changePct), 5);
  return 0.12 + (clamped / 5) * 0.68;
}

export function WatchHeatmap({
  items,
  activeId,
  onSelect,
}: {
  items: WatchItem[];
  activeId?: string | null;
  onSelect: (item: WatchItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const up = item.changePct >= 0;
        const active = activeId === item.id;
        const extreme = item.near20High || item.near20Low;
        const fragile = isFragile(item);
        const bgColor = up ? colors.up : colors.down;
        const alpha = intensity(item.changePct);

        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item)}
            style={[
              styles.cell,
              { backgroundColor: `${bgColor}${Math.round(alpha * 255).toString(16).padStart(2, "0")}` },
              extreme && styles.cellExtreme,
              active && styles.cellActive,
            ]}
          >
            <View style={styles.cellTop}>
              <Text style={styles.ticker} numberOfLines={1}>
                {item.displayTicker.split("/")[0] ?? item.displayTicker}
              </Text>
              {fragile ? <Text style={styles.fragileIcon}>○</Text> : null}
            </View>
            <Text style={[styles.delta, { color: up ? colors.up : colors.down }]}>
              {formatPct(item.changePct, 1)}
            </Text>
            <Text style={styles.rsi}>rsi {item.rsi14.toFixed(0)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  cell: {
    width: "31%",
    flexGrow: 1,
    borderRadius: radius.sm,
    padding: 8,
    gap: 2,
    overflow: "hidden",
  },
  cellExtreme: {
    borderWidth: 1,
    borderColor: colors.warn,
  },
  cellActive: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  cellTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  ticker: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.fg,
    flexShrink: 1,
  },
  fragileIcon: {
    fontSize: 10,
    color: colors.warn,
  },
  delta: {
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  rsi: {
    fontSize: 9,
    color: colors.subtle,
    fontVariant: ["tabular-nums"],
  },
});
