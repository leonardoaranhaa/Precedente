import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { ExternalLink, Newspaper } from "lucide-react-native";
import { colors, radius } from "../theme";
import { formatAgo } from "../format";
import type { NewsContextPayload } from "../types";

export function NewsCard({
  newsContext,
}: {
  newsContext: NewsContextPayload | null | undefined;
}) {
  if (!newsContext) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Newspaper size={14} color={colors.muted} />
          <Text style={styles.title}>Contexto de notícias</Text>
        </View>
        <Text style={styles.empty}>
          Nenhum contexto de notícias disponível para esta análise.
        </Text>
      </View>
    );
  }

  const { items, coin, disclaimer } = newsContext;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Newspaper size={14} color={colors.muted} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title}>Contexto · {coin || "notícias"}</Text>
          <Text style={styles.disclaimer}>{disclaimer}</Text>
        </View>
      </View>

      {items.length === 0 ? (
        <Text style={styles.empty}>
          Nenhuma manchete recente relacionada a {coin || "este ativo"} nas
          fontes agregadas.
        </Text>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <Pressable
              key={item.link}
              style={styles.item}
              onPress={() => Linking.openURL(item.link)}
            >
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>
                  {item.source}
                  {item.publishedAt != null ? ` · ${formatAgo(item.publishedAt)}` : ""}
                </Text>
              </View>
              <ExternalLink size={12} color={colors.subtle} style={{ marginTop: 2 }} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.fg,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.subtle,
    marginTop: 2,
    lineHeight: 15,
  },
  empty: {
    fontSize: 12,
    color: colors.muted,
  },
  list: {
    gap: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  itemTitle: {
    fontSize: 13,
    color: colors.fg,
    lineHeight: 18,
  },
  itemMeta: {
    fontSize: 11,
    color: colors.subtle,
  },
});
