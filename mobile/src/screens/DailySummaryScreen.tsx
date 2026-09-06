import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronLeft,
  Newspaper,
  TrendingUp,
} from "lucide-react-native";
import { colors, radius } from "../theme";
import { formatAgo, formatPct, formatPrice, timeframeLabel } from "../format";
import { sampleTitle } from "../sample-copy";
import { isFragile } from "../watch-filters";
import { fetchMovers } from "../api";
import { fetchNewsFeed, type NewsItem } from "../news";
import type { MoverRow, MoversSnapshot } from "../types";
import type { WatchItem } from "../watchlist";

function watchFlags(item: WatchItem): string[] {
  const flags: string[] = [];
  if (item.sampleNote !== "ok") flags.push(`amostra ${item.sampleNote === "tiny" ? "mínima" : "limitada"}`);
  if (Math.abs(item.medianDrawdownPct) >= 3) flags.push(`DD med ${formatPct(item.medianDrawdownPct, 1)}`);
  if (item.near20High) flags.push("perto high20");
  if (item.near20Low) flags.push("perto low20");
  if (item.priceZone?.enabled) flags.push("zona de preço ativa");
  if (item.rsiZone?.enabled) {
    if (item.rsiZone.below != null && item.rsi14 <= item.rsiZone.below) flags.push("RSI no piso");
    if (item.rsiZone.above != null && item.rsi14 >= item.rsiZone.above) flags.push("RSI no teto");
  }
  return flags;
}

function WatchSection({
  items,
  onOpen,
}: {
  items: WatchItem[];
  onOpen: (item: WatchItem) => void;
}) {
  const flagged = items.filter((i) => watchFlags(i).length > 0);
  const clean = items.filter((i) => watchFlags(i).length === 0);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <CalendarDays size={14} color={colors.muted} />
        <Text style={styles.sectionTitle}>Watch</Text>
        <Text style={styles.sectionCount}>
          {flagged.length > 0
            ? `${flagged.length} c/ flag · ${items.length} total`
            : `${items.length} par(es)`}
        </Text>
      </View>

      {items.length === 0 ? (
        <Text style={styles.emptyText}>
          Sem pares na watch. Analise um ativo e adicione à watch pra vê-lo aqui.
        </Text>
      ) : (
        <>
          {flagged.map((item) => (
            <WatchRow key={item.id} item={item} flags={watchFlags(item)} onPress={() => onOpen(item)} />
          ))}
          {clean.map((item) => (
            <WatchRow key={item.id} item={item} flags={[]} onPress={() => onOpen(item)} />
          ))}
        </>
      )}
    </View>
  );
}

function WatchRow({
  item,
  flags,
  onPress,
}: {
  item: WatchItem;
  flags: string[];
  onPress: () => void;
}) {
  const up = item.changePct >= 0;
  const fragile = isFragile(item);

  return (
    <Pressable style={styles.watchRow} onPress={onPress}>
      <View style={styles.watchRowLeft}>
        <View style={styles.watchRowTicker}>
          <Text style={styles.watchTicker} numberOfLines={1}>
            {item.displayTicker.split("/")[0] ?? item.displayTicker}
          </Text>
          <Text style={styles.watchTf}>{timeframeLabel(item.timeframe)}</Text>
          {fragile ? <Text style={styles.fragileIcon}>○</Text> : null}
        </View>
        {flags.length > 0 ? (
          <Text style={styles.watchFlags} numberOfLines={2}>
            {flags.join(" · ")}
          </Text>
        ) : (
          <Text style={styles.watchClean}>sem flag de prevenção</Text>
        )}
      </View>
      <View style={styles.watchRowRight}>
        <Text style={[styles.watchDelta, { color: up ? colors.up : colors.down }]}>
          {formatPct(item.changePct, 1)}
        </Text>
        <Text style={styles.watchSample}>{sampleTitle(item.sampleNote)}</Text>
      </View>
    </Pressable>
  );
}

function NewsSection({ items }: { items: NewsItem[] }) {
  const capped = items.slice(0, 6);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Newspaper size={14} color={colors.muted} />
        <Text style={styles.sectionTitle}>Notícias</Text>
        <Text style={styles.sectionCount}>{items.length} recente(s)</Text>
      </View>

      {capped.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma notícia recente disponível.</Text>
      ) : (
        capped.map((item) => (
          <Pressable
            key={item.id}
            style={styles.newsRow}
            onPress={() => void Linking.openURL(item.link)}
          >
            <Text style={styles.newsMeta}>
              {item.source}
              {item.publishedAt != null ? ` · ${formatAgo(item.publishedAt)}` : ""}
            </Text>
            <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
            {item.coins.length > 0 ? (
              <View style={styles.coinBadgeRow}>
                {item.coins.slice(0, 4).map((c) => (
                  <View key={c} style={styles.coinBadge}>
                    <Text style={styles.coinBadgeText}>{c}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Pressable>
        ))
      )}
    </View>
  );
}

function MoversSection({ snapshot }: { snapshot: MoversSnapshot }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <TrendingUp size={14} color={colors.muted} />
        <Text style={styles.sectionTitle}>Movers 24h</Text>
      </View>

      <View style={styles.moversGrid}>
        <View style={styles.moversCol}>
          <View style={styles.moversLabel}>
            <ArrowUp size={10} color={colors.up} />
            <Text style={[styles.moversLabelText, { color: colors.up }]}>Maiores altas</Text>
          </View>
          {snapshot.gainers.slice(0, 4).map((r) => (
            <MoverRowView key={r.symbol} row={r} />
          ))}
        </View>
        <View style={styles.moversCol}>
          <View style={styles.moversLabel}>
            <ArrowDown size={10} color={colors.down} />
            <Text style={[styles.moversLabelText, { color: colors.down }]}>Maiores baixas</Text>
          </View>
          {snapshot.losers.slice(0, 4).map((r) => (
            <MoverRowView key={r.symbol} row={r} />
          ))}
        </View>
      </View>

      <Text style={styles.disclaimer}>{snapshot.disclaimer}</Text>
    </View>
  );
}

function MoverRowView({ row }: { row: MoverRow }) {
  const up = row.changePct >= 0;
  return (
    <View style={styles.moverRow}>
      <Text style={styles.moverTicker} numberOfLines={1}>{row.base}</Text>
      <Text style={[styles.moverPrice, { color: colors.muted }]}>{formatPrice(row.lastPrice)}</Text>
      <Text style={[styles.moverDelta, { color: up ? colors.up : colors.down }]}>
        {formatPct(row.changePct, 1)}
      </Text>
    </View>
  );
}

export function DailySummaryScreen({
  watchItems,
  onBack,
  onOpenWatch,
}: {
  watchItems: WatchItem[];
  onBack: () => void;
  onOpenWatch: (item: WatchItem) => void;
}) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [movers, setMovers] = useState<MoversSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent?: boolean) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [newsRes, moversRes] = await Promise.all([
        fetchNewsFeed().catch(() => ({ items: [] as NewsItem[], total: 0, matched: 0 })),
        fetchMovers(5).catch(() => null),
      ]);
      setNews(newsRes.items);
      setMovers(moversRes);
    } catch {
      setError("Não foi possível carregar o resumo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load(true);
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
      }
    >
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <ChevronLeft size={22} color={colors.fg} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>Resumo diário</Text>
          <Text style={styles.dateLabel}>{dateStr}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.muted} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <>
          <WatchSection items={watchItems} onOpen={onOpenWatch} />
          <NewsSection items={news} />
          {movers ? <MoversSection snapshot={movers} /> : null}
          <Text style={styles.footerDisclaimer}>
            Só contexto factual — não é recomendação nem sinal.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  screenTitle: { fontSize: 20, fontWeight: "600", color: colors.fg },
  dateLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },

  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    gap: 10,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.muted,
    textTransform: "uppercase",
    flex: 1,
  },
  sectionCount: { fontSize: 10, color: colors.subtle, fontVariant: ["tabular-nums"] },
  emptyText: { fontSize: 12, color: colors.muted },

  watchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  watchRowLeft: { flex: 1, gap: 3 },
  watchRowTicker: { flexDirection: "row", alignItems: "center", gap: 6 },
  watchTicker: { fontSize: 13, fontWeight: "600", color: colors.fg },
  watchTf: { fontSize: 10, color: colors.subtle },
  fragileIcon: { fontSize: 10, color: colors.warn },
  watchFlags: { fontSize: 11, color: colors.warn, lineHeight: 15 },
  watchClean: { fontSize: 11, color: colors.subtle },
  watchRowRight: { alignItems: "flex-end", gap: 2 },
  watchDelta: { fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"] },
  watchSample: { fontSize: 10, color: colors.muted },

  newsRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 3,
  },
  newsMeta: { fontSize: 10, color: colors.subtle },
  newsTitle: { fontSize: 13, color: colors.fg, lineHeight: 18 },
  coinBadgeRow: { flexDirection: "row", gap: 6, marginTop: 2 },
  coinBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.xl,
    backgroundColor: colors.accent,
  },
  coinBadgeText: { fontSize: 9, color: colors.accentFg, fontWeight: "600" },

  moversGrid: { flexDirection: "row", gap: 10 },
  moversCol: { flex: 1, gap: 6 },
  moversLabel: { flexDirection: "row", alignItems: "center", gap: 4 },
  moversLabelText: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  moverRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  moverTicker: { fontSize: 12, fontWeight: "500", color: colors.fg, width: 40 },
  moverPrice: { fontSize: 11, fontVariant: ["tabular-nums"], flex: 1, textAlign: "right" },
  moverDelta: { fontSize: 11, fontWeight: "600", fontVariant: ["tabular-nums"], width: 52, textAlign: "right" },

  disclaimer: { fontSize: 10, color: colors.subtle, lineHeight: 14 },
  footerDisclaimer: {
    fontSize: 11,
    color: colors.subtle,
    textAlign: "center",
    marginTop: 4,
  },
  errorText: { fontSize: 13, color: colors.down, textAlign: "center", marginTop: 24 },
});
