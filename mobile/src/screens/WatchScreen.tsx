import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { RefreshCw, Star, Target, Trash2 } from "lucide-react-native";
import { Badge } from "../components/Badge";
import { DexWatchlistSection } from "../components/DexWatchlistSection";
import { colors, radius } from "../theme";
import { formatAgo, formatPct, formatPrice, formatWhen, timeframeLabel } from "../format";
import {
  applyQuickFilter,
  filterByTab,
  filterByTimeframe,
  quickFilterLabel,
  WATCH_QUICK_FILTERS,
  WATCH_TABS,
  WATCH_TF_FILTER_ALL,
  type WatchQuickFilter,
  type WatchTab,
  type WatchTfFilter,
} from "../watch-filters";
import { watchRefreshLabel } from "../watch-refresh";
import { TIMEFRAMES, WATCH_REFRESH_MINUTES, type WatchRefreshMinutes } from "../types";
import type { WatchItem } from "../watchlist";
import type { DexWatchItem } from "../dex-watchlist";

const TAB_LABEL: Record<WatchTab, string> = {
  mine: "Minha watch",
  focus: "Em foco",
  fragile: "Frágeis",
};

export function WatchScreen({
  items,
  focusIds = [],
  refreshingId,
  refreshingAll,
  error,
  autoRefreshMin = 0,
  onAutoRefreshMin,
  onOpen,
  onRemove,
  onRefresh,
  onRefreshAll,
  onOpenZone,
  dexItems = [],
  onOpenDex,
  onUnpinDex,
}: {
  items: WatchItem[];
  focusIds?: string[];
  refreshingId: string | null;
  refreshingAll: boolean;
  error: string | null;
  autoRefreshMin?: WatchRefreshMinutes;
  onAutoRefreshMin?: (v: WatchRefreshMinutes) => void;
  onOpen: (item: WatchItem) => void;
  onRemove: (id: string) => void;
  onRefresh: (item: WatchItem) => void;
  onRefreshAll: () => void;
  onOpenZone: (item: WatchItem) => void;
  /** Lista separada — tokens DEX pinados pro alerta de drenagem. */
  dexItems?: DexWatchItem[];
  onOpenDex?: (ticker: string) => void;
  onUnpinDex?: (ticker: string) => void;
}) {
  const [tab, setTab] = useState<WatchTab>("mine");
  const [quickFilter, setQuickFilter] = useState<WatchQuickFilter>("all");
  const [tfFilter, setTfFilter] = useState<WatchTfFilter>(WATCH_TF_FILTER_ALL);

  const visible = useMemo(() => {
    let out = filterByTab(items, tab, focusIds);
    out = applyQuickFilter(out, quickFilter);
    out = filterByTimeframe(out, tfFilter);
    return out;
  }, [items, tab, focusIds, quickFilter, tfFilter]);

  if (items.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.list}>
        {onOpenDex && onUnpinDex ? (
          <DexWatchlistSection items={dexItems} onOpen={onOpenDex} onUnpin={onUnpinDex} />
        ) : null}
        <View style={styles.empty}>
          <Star size={22} color={colors.subtle} />
          <Text style={styles.emptyTitle}>Nenhum par na watch.</Text>
          <Text style={styles.emptyHint}>
            Depois de analisar um par, toque em + Watch para acompanhar amostra e drawdown aqui.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const busy = refreshingAll || refreshingId != null;

  return (
    <FlatList
      data={visible}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View>
          {onOpenDex && onUnpinDex ? (
            <DexWatchlistSection items={dexItems} onOpen={onOpenDex} onUnpin={onUnpinDex} />
          ) : null}
          <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Watch</Text>
              <Text style={styles.subtitle}>
                Pares pinados — Δ, amostra e DD. Atualização automática, não é preço ao vivo.
              </Text>
            </View>
            <Pressable
              onPress={onRefreshAll}
              disabled={busy}
              style={[styles.refreshAll, busy && { opacity: 0.5 }]}
              accessibilityLabel="Reavaliar todos"
            >
              {refreshingAll ? (
                <ActivityIndicator size="small" color={colors.fg} />
              ) : (
                <RefreshCw size={16} color={colors.fg} />
              )}
              <Text style={styles.refreshAllText}>Reavaliar</Text>
            </Pressable>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {onAutoRefreshMin ? (
            <View style={styles.autoRow}>
              <Text style={styles.autoLabel}>Auto</Text>
              {WATCH_REFRESH_MINUTES.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => onAutoRefreshMin(m)}
                  style={[
                    styles.autoChip,
                    autoRefreshMin === m && { backgroundColor: colors.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.autoChipText,
                      autoRefreshMin === m && { color: colors.accentFg },
                    ]}
                  >
                    {watchRefreshLabel(m)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.tabRow}>
            {WATCH_TABS.map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[styles.tab, tab === t && { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.tabText, tab === t && { color: colors.fg }]}>
                  {TAB_LABEL[t]}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {WATCH_QUICK_FILTERS.map((f) => (
              <Pressable
                key={f}
                onPress={() => setQuickFilter(f)}
                style={[styles.chip, quickFilter === f && { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.chipText, quickFilter === f && { color: colors.accentFg }]}>
                  {quickFilterLabel(f)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            <Pressable
              onPress={() => setTfFilter(WATCH_TF_FILTER_ALL)}
              style={[
                styles.chip,
                tfFilter === WATCH_TF_FILTER_ALL && { backgroundColor: colors.accent },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  tfFilter === WATCH_TF_FILTER_ALL && { color: colors.accentFg },
                ]}
              >
                Todos TFs
              </Text>
            </Pressable>
            {TIMEFRAMES.map((tf) => (
              <Pressable
                key={tf}
                onPress={() => setTfFilter(tf)}
                style={[styles.chip, tfFilter === tf && { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.chipText, tfFilter === tf && { color: colors.accentFg }]}>
                  {tf}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.colHeader}>
            <Text style={[styles.col, { flex: 1, textAlign: "left" }]}>
              Par · {visible.length}
              {visible.length !== items.length ? `/${items.length}` : ""}
            </Text>
            <Text style={styles.col}>Δ</Text>
            <Text style={styles.col}>Amostra</Text>
            <Text style={styles.col}>DD10</Text>
          </View>
          </View>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.emptyFilter}>Nada nesse filtro agora.</Text>
      }
      renderItem={({ item }) => {
        const up = item.changePct >= 0;
        const extreme = item.near20High || item.near20Low;
        const rowBusy = refreshingId === item.id;
        const zoneActive = Boolean(item.priceZone?.enabled || item.rsiZone?.enabled);
        return (
          <View style={[styles.row, rowBusy && styles.rowBusy]}>
            <Pressable
              style={styles.rowMain}
              onPress={() => onOpen(item)}
              disabled={busy}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.ticker} numberOfLines={1}>
                    {item.displayTicker.split("/")[0] ?? item.displayTicker}
                  </Text>
                  {extreme ? <Text style={{ color: colors.warn, fontSize: 10 }}>▲</Text> : null}
                  {zoneActive ? <Target size={11} color={colors.warn} /> : null}
                </View>
                {rowBusy ? (
                  <Text style={[styles.meta, { color: colors.warn }]}>reavaliando…</Text>
                ) : (
                  <Text style={styles.meta} numberOfLines={1}>
                    {timeframeLabel(item.timeframe)} · há {formatAgo(item.updatedAt)} · RSI{" "}
                    {item.rsi14.toFixed(0)}
                  </Text>
                )}
                <Text style={styles.agoFull} numberOfLines={1}>
                  {formatPrice(item.price)} · {formatWhen(item.updatedAt)}
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
              onPress={() => onOpenZone(item)}
              disabled={busy}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityLabel={`Zona de alerta de ${item.displayTicker}`}
            >
              <Target size={15} color={zoneActive ? colors.warn : colors.subtle} />
            </Pressable>
            <Pressable
              onPress={() => onRefresh(item)}
              disabled={busy}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityLabel={`Reavaliar ${item.displayTicker}`}
            >
              {rowBusy ? (
                <ActivityIndicator size="small" color={colors.muted} />
              ) : (
                <RefreshCw size={15} color={colors.muted} />
              )}
            </Pressable>
            <Pressable
              onPress={() => onRemove(item.id)}
              disabled={busy}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityLabel={`Remover ${item.displayTicker}`}
            >
              <Trash2 size={15} color={colors.subtle} />
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
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  title: { fontSize: 28, color: colors.fg, fontWeight: "500" },
  subtitle: { fontSize: 13, color: colors.muted, lineHeight: 18, marginTop: 4 },
  refreshAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    marginTop: 4,
  },
  refreshAllText: { fontSize: 12, fontWeight: "500", color: colors.fg },
  autoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  autoLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.subtle,
    textTransform: "uppercase",
    marginRight: 2,
  },
  autoChip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  autoChipText: { fontSize: 11, fontWeight: "500", color: colors.muted },
  error: {
    fontSize: 12,
    color: colors.down,
    backgroundColor: "rgba(193,123,106,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
    lineHeight: 17,
  },
  tabRow: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: 4,
    marginTop: 4,
  },
  tab: { flex: 1, height: 34, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  tabText: { fontSize: 12, fontWeight: "500", color: colors.muted },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontSize: 11, fontWeight: "500", color: colors.muted },
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
  emptyFilter: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 13,
    paddingVertical: 32,
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
    paddingRight: 4,
    gap: 2,
  },
  rowBusy: {
    borderWidth: 1,
    borderColor: "rgba(196,165,116,0.45)",
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ticker: { fontSize: 14, fontWeight: "600", color: colors.fg },
  meta: { fontSize: 11, color: colors.subtle, marginTop: 2 },
  agoFull: { fontSize: 10, color: colors.subtle, marginTop: 1, opacity: 0.85 },
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
  iconBtn: { padding: 8 },
});
