import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Newspaper, Settings2 } from "lucide-react-native";
import { colors, radius } from "../theme";
import { formatAgo } from "../format";
import { fetchNewsFeed, NEWS_CATEGORIES, type NewsItem } from "../news";

const CATEGORY_LABEL = Object.fromEntries(NEWS_CATEGORIES.map((c) => [c.id, c.label]));

export function NewsScreen({
  signedIn,
  refreshKey = 0,
  onOpenPreferences,
}: {
  signedIn: boolean;
  /** Muda quando as preferências são salvas alhures — refaz a busca. */
  refreshKey?: number;
  onOpenPreferences: () => void;
}) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFilter, setHasFilter] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const res = await fetchNewsFeed();
      setItems(res.items);
      setHasFilter(res.matched !== res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível buscar notícias.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, signedIn, refreshKey]);

  async function onRefresh() {
    setRefreshing(true);
    await load({ silent: true });
  }

  return (
    <FlatList
      data={loading ? [] : items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleLine}>
                <Newspaper size={20} color={colors.fg} />
                <Text style={styles.title}>Notícias</Text>
              </View>
              <Text style={styles.subtitle}>
                {signedIn
                  ? hasFilter
                    ? "Filtrado pelas suas preferências."
                    : "Sem filtro salvo — mostrando tudo."
                  : "Entre na sua conta pra filtrar por moeda e categoria."}
              </Text>
            </View>
            <Pressable
              onPress={onOpenPreferences}
              style={styles.prefsBtn}
              accessibilityLabel="Preferências de notícias"
            >
              <Settings2 size={18} color={colors.fg} />
            </Pressable>
          </View>
          {loading ? <ActivityIndicator style={{ marginTop: 24 }} color={colors.muted} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!loading && !error && items.length === 0 ? (
            <Text style={styles.empty}>
              {hasFilter
                ? "Nenhuma notícia recente bate com suas preferências."
                : "Nenhuma notícia disponível agora. Puxe pra atualizar."}
            </Text>
          ) : null}
        </View>
      }
      renderItem={({ item }) => <NewsRow item={item} />}
    />
  );
}

function NewsRow({ item }: { item: NewsItem }) {
  return (
    <Pressable style={styles.card} onPress={() => void Linking.openURL(item.link)}>
      <Text style={styles.cardMeta}>
        {item.source}
        {item.publishedAt ? ` · ${formatAgo(item.publishedAt)}` : ""}
      </Text>
      <Text style={styles.cardTitle}>{item.title}</Text>
      {item.coins.length > 0 || item.categories.length > 0 ? (
        <View style={styles.badgeRow}>
          {item.coins.map((c) => (
            <View key={c} style={styles.badgeAccent}>
              <Text style={styles.badgeAccentText}>{c}</Text>
            </View>
          ))}
          {item.categories.map((c) => (
            <View key={c} style={styles.badge}>
              <Text style={styles.badgeText}>{CATEGORY_LABEL[c] ?? c}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  header: { gap: 4, marginBottom: 6 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  titleLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 22, fontWeight: "600", color: colors.fg },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 4 },
  prefsBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { marginTop: 16, fontSize: 13, color: colors.down },
  empty: { marginTop: 24, fontSize: 13, color: colors.muted, textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    gap: 6,
    marginBottom: 10,
  },
  cardMeta: { fontSize: 11, color: colors.subtle },
  cardTitle: { fontSize: 14, color: colors.fg, lineHeight: 19 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xl,
    backgroundColor: colors.bgElevated,
  },
  badgeText: { fontSize: 10, color: colors.muted, fontWeight: "500" },
  badgeAccent: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xl,
    backgroundColor: colors.accent,
  },
  badgeAccentText: { fontSize: 10, color: colors.accentFg, fontWeight: "600" },
});
