import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Star, Trash2 } from "lucide-react-native";
import { Badge } from "../components/Badge";
import { colors, radius } from "../theme";
import { formatPct, formatPrice, timeframeLabel } from "../format";
import type { WatchItem } from "../watchlist";

export function WatchScreen({
  items,
  onOpen,
  onRemove,
}: {
  items: WatchItem[];
  onOpen: (item: WatchItem) => void;
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Star size={22} color={colors.subtle} />
        <Text style={styles.emptyTitle}>Nenhum par na watch.</Text>
        <Text style={styles.emptyHint}>
          Após uma análise, toque em + Watch para acompanhar amostra e drawdown neste aparelho.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Watch</Text>
          <Text style={styles.subtitle}>
            Pares pinados — Δ, amostra e DD do caminho. Sem conta.
          </Text>
          <View style={styles.colHeader}>
            <Text style={[styles.col, { flex: 1 }]}>Par</Text>
            <Text style={styles.col}>Δ</Text>
            <Text style={styles.col}>Amostra</Text>
            <Text style={styles.col}>DD10</Text>
          </View>
        </View>
      }
      renderItem={({ item }) => {
        const up = item.changePct >= 0;
        const extreme = item.near20High || item.near20Low;
        return (
          <View style={styles.row}>
            <Pressable style={styles.rowMain} onPress={() => onOpen(item)}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.ticker} numberOfLines={1}>
                    {item.displayTicker.split("/")[0] ?? item.displayTicker}
                  </Text>
                  {extreme ? <Text style={{ color: colors.warn, fontSize: 10 }}>▲</Text> : null}
                </View>
                <Text style={styles.meta} numberOfLines={1}>
                  {timeframeLabel(item.timeframe)} · RSI {item.rsi14.toFixed(0)} ·{" "}
                  {formatPrice(item.price)}
                </Text>
              </View>
              <Text style={[styles.delta, { color: up ? colors.up : colors.down }]}>
                {formatPct(item.changePct, 1)}
              </Text>
              <Badge
                label={item.sampleNote.toUpperCase()}
                accent={item.sampleNote === "ok"}
                warn={item.sampleNote !== "ok"}
              />
              <Text style={styles.dd}>{formatPct(item.medianDrawdownPct, 1)}</Text>
            </Pressable>
            <Pressable
              onPress={() => onRemove(item.id)}
              hitSlop={8}
              style={styles.trash}
              accessibilityLabel={`Remover ${item.displayTicker}`}
            >
              <Trash2 size={16} color={colors.subtle} />
            </Pressable>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 48, gap: 8 },
  header: { gap: 8, marginBottom: 8 },
  title: { fontSize: 28, color: colors.fg, fontWeight: "500" },
  subtitle: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  colHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  col: {
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.subtle,
    textTransform: "uppercase",
    width: 56,
    textAlign: "right",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 14, color: colors.muted },
  emptyHint: { fontSize: 12, color: colors.subtle, textAlign: "center", maxWidth: 280 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 8,
    gap: 4,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ticker: { fontSize: 14, fontWeight: "600", color: colors.fg },
  meta: { fontSize: 11, color: colors.subtle, marginTop: 2 },
  delta: {
    width: 52,
    textAlign: "right",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  dd: {
    width: 52,
    textAlign: "right",
    fontSize: 12,
    color: colors.down,
    fontVariant: ["tabular-nums"],
  },
  trash: { padding: 8 },
});
