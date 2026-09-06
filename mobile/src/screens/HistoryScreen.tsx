import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowDown, ArrowUp, Clock, Minus } from "lucide-react-native";
import { Badge } from "../components/Badge";
import { colors, radius } from "../theme";
import { formatPct, formatWhen, timeframeLabel } from "../format";
import type { StoredAnalysis } from "../types";

function signalDirection(a: StoredAnalysis): { dir: "up" | "down" | "flat"; pct: number } {
  const h = a.precedent.horizons;
  const mid = h.find((x) => x.bars === 10) ?? h[Math.min(1, h.length - 1)] ?? h[0];
  if (!mid) return { dir: "flat", pct: 0 };
  if (mid.medianPct > 0.15) return { dir: "up", pct: mid.medianPct };
  if (mid.medianPct < -0.15) return { dir: "down", pct: mid.medianPct };
  return { dir: "flat", pct: mid.medianPct };
}

export function HistoryScreen({
  items,
  signedIn,
  onOpen,
}: {
  items: StoredAnalysis[];
  signedIn: boolean;
  onOpen: (item: StoredAnalysis) => void;
}) {
  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Clock size={22} color={colors.subtle} />
        <Text style={styles.emptyTitle}>Nenhuma análise ainda.</Text>
        <Text style={styles.emptyHint}>
          {signedIn
            ? "Suas análises sincronizam com sua conta entre aparelhos."
            : "As análises ficam neste aparelho. Entre na sua conta pra sincronizar entre aparelhos."}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const sig = signalDirection(item);
        const DirIcon = sig.dir === "up" ? ArrowUp : sig.dir === "down" ? ArrowDown : Minus;
        const dirColor = sig.dir === "up" ? colors.up : sig.dir === "down" ? colors.down : colors.subtle;
        return (
          <Pressable style={styles.row} onPress={() => onOpen(item)}>
            {item.thumbUri ? (
              <Image source={{ uri: item.thumbUri }} style={styles.thumb} />
            ) : (
              <View style={styles.thumbFallback}>
                <Text style={styles.thumbFallbackText}>{item.displayTicker.split("/")[0]}</Text>
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.displayTicker}
                  <Text style={styles.mutedText}> · {timeframeLabel(item.timeframe)}</Text>
                </Text>
                <Badge
                  label={item.precedent.sampleNote.toUpperCase()}
                  accent={item.precedent.sampleNote === "ok"}
                  warn={item.precedent.sampleNote !== "ok"}
                />
              </View>
              <Text style={styles.subtitle}>
                {item.precedent.matches} precedentes · {formatWhen(item.createdAt)}
              </Text>
            </View>
            <View style={styles.signal}>
              <DirIcon size={14} color={dirColor} />
              <Text style={[styles.signalPct, { color: dirColor }]}>
                {formatPct(sig.pct, 1)}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, gap: 8 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 80 },
  emptyTitle: { fontSize: 14, color: colors.muted },
  emptyHint: { fontSize: 12, color: colors.subtle, textAlign: "center", maxWidth: 260 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
  },
  thumb: { width: 52, height: 52, borderRadius: radius.sm },
  thumbFallback: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbFallbackText: { fontSize: 11, color: colors.muted },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 14, fontWeight: "500", color: colors.fg, flex: 1 },
  mutedText: { color: colors.muted, fontWeight: "400" },
  subtitle: { fontSize: 12, color: colors.muted },
  signal: { alignItems: "center", gap: 2, width: 42 },
  signalPct: { fontSize: 10, fontVariant: ["tabular-nums"], fontWeight: "600" },
});
