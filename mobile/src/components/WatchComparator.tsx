import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { Columns3 } from "lucide-react-native";
import { colors, radius } from "../theme";
import { formatPct, timeframeLabel } from "../format";
import { sampleTitle } from "../sample-copy";
import { API_BASE_URL } from "../config";
import type { WatchItem } from "../watchlist";

const MAX_SELECTED = 4;

type SparkState =
  | { status: "loading" }
  | { status: "ok"; closes: number[] }
  | { status: "error" };

function useSparkline(item: WatchItem): SparkState {
  const [state, setState] = useState<SparkState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    fetch(
      `${API_BASE_URL}/api/sparkline?symbol=${encodeURIComponent(item.ticker)}&interval=${item.timeframe}`,
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("sparkline"))))
      .then((body: { closes?: number[] }) => {
        if (!alive) return;
        if (Array.isArray(body.closes) && body.closes.length > 1) {
          setState({ status: "ok", closes: body.closes });
        } else {
          setState({ status: "error" });
        }
      })
      .catch(() => {
        if (alive) setState({ status: "error" });
      });
    return () => { alive = false; };
  }, [item.ticker, item.timeframe]);

  return state;
}

function MiniSparkline({ closes }: { closes: number[] }) {
  const w = 140;
  const h = 40;
  const pad = 2;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const points = closes
    .map((c, i) => {
      const x = pad + (i / (closes.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((c - min) / range) * (h - 2 * pad);
      return `${x},${y}`;
    })
    .join(" ");

  const up = closes[closes.length - 1]! >= closes[0]!;

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Polyline
        points={points}
        fill="none"
        stroke={up ? colors.up : colors.down}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ComparatorCard({
  item,
  onSelect,
}: {
  item: WatchItem;
  onSelect: () => void;
}) {
  const spark = useSparkline(item);
  const up = item.changePct >= 0;

  return (
    <Pressable style={styles.card} onPress={onSelect}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTicker} numberOfLines={1}>
          {item.displayTicker.split("/")[0] ?? item.displayTicker}
        </Text>
        <Text style={styles.cardTf}>{timeframeLabel(item.timeframe)}</Text>
      </View>
      <View style={styles.sparkWrap}>
        {spark.status === "ok" ? (
          <MiniSparkline closes={spark.closes} />
        ) : spark.status === "loading" ? (
          <ActivityIndicator size="small" color={colors.subtle} />
        ) : (
          <Text style={styles.sparkError}>indisponível</Text>
        )}
      </View>
      <View style={styles.cardFooter}>
        <Text style={[styles.cardStat, { color: up ? colors.up : colors.down, fontWeight: "600" }]}>
          {formatPct(item.changePct, 1)}
        </Text>
        <Text style={[styles.cardStat, { color: colors.muted }]}>{sampleTitle(item.sampleNote)}</Text>
        <Text style={[styles.cardStat, { color: colors.down }]}>
          dd10 {formatPct(item.medianDrawdownPct, 1)}
        </Text>
      </View>
    </Pressable>
  );
}

export function WatchComparator({
  items,
  onSelect,
}: {
  items: WatchItem[];
  onSelect: (item: WatchItem) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    items.slice(0, MAX_SELECTED).map((i) => i.id),
  );

  if (items.length < 2) return null;

  function toggle(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (current.length >= MAX_SELECTED) return current;
      return [...current, id];
    });
  }

  const selected = items.filter((i) => selectedIds.includes(i.id));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Columns3 size={13} color={colors.muted} />
          <Text style={styles.headerTitle}>Comparador</Text>
        </View>
        <Text style={styles.headerCount}>
          {selected.length}/{MAX_SELECTED}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {items.map((item) => {
          const active = selectedIds.includes(item.id);
          const disabled = !active && selectedIds.length >= MAX_SELECTED;
          return (
            <Pressable
              key={item.id}
              onPress={() => toggle(item.id)}
              disabled={disabled}
              style={[
                styles.chip,
                active && { backgroundColor: colors.accent },
                disabled && { opacity: 0.4 },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  active && { color: colors.accentFg },
                ]}
                numberOfLines={1}
              >
                {item.displayTicker.split("/")[0] ?? item.displayTicker}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selected.length === 0 ? (
        <Text style={styles.emptyText}>
          Escolha até {MAX_SELECTED} pares acima pra comparar.
        </Text>
      ) : (
        <View style={styles.cardsGrid}>
          {selected.map((item) => (
            <ComparatorCard key={item.id} item={item} onSelect={() => onSelect(item)} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.muted,
    textTransform: "uppercase",
  },
  headerCount: {
    fontSize: 10,
    color: colors.subtle,
    fontVariant: ["tabular-nums"],
  },
  chipRow: {
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chip: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: radius.xs,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.muted,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 11,
    color: colors.muted,
    paddingVertical: 24,
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    padding: 10,
  },
  card: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: 10,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 4,
  },
  cardTicker: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.fg,
    flexShrink: 1,
  },
  cardTf: {
    fontSize: 10,
    color: colors.subtle,
  },
  sparkWrap: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkError: {
    fontSize: 10,
    color: colors.down,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardStat: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
});
