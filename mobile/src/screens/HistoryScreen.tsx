import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Clock } from "lucide-react-native";
import { colors, radius } from "../theme";
import { formatWhen, timeframeLabel } from "../format";
import type { StoredAnalysis } from "../types";

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
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => onOpen(item)}>
          {item.thumbUri ? (
            <Image source={{ uri: item.thumbUri }} style={styles.thumb} />
          ) : (
            <View style={styles.thumbFallback}>
              <Text style={styles.thumbFallbackText}>{item.displayTicker.split("/")[0]}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {item.displayTicker}
              <Text style={styles.muted}> · {timeframeLabel(item.timeframe)}</Text>
            </Text>
            <Text style={styles.subtitle}>
              {item.precedent.matches} precedentes · {formatWhen(item.createdAt)}
            </Text>
          </View>
        </Pressable>
      )}
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
  title: { fontSize: 14, fontWeight: "500", color: colors.fg },
  muted: { color: colors.muted, fontWeight: "400" },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
