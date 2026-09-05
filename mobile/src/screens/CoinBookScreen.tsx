import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowDownRight, ArrowUpRight, Minus, RefreshCw, Search, X } from "lucide-react-native";
import { fetchMovers, fetchTopTraded } from "../api";
import { colors, radius } from "../theme";
import { fonts } from "../fonts";
import type { MoverRow, MoversSnapshot, TradedPair } from "../types";

type Tab = "volume" | "gainers" | "losers" | "volatile";

const TABS: { key: Tab; label: string }[] = [
  { key: "volume", label: "Volume" },
  { key: "gainers", label: "Alta" },
  { key: "losers", label: "Baixa" },
  { key: "volatile", label: "Voláteis" },
];

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(4);
  return n.toFixed(6);
}

function fmtPct(n: number): string {
  const s = Math.abs(n).toFixed(1);
  return `${n >= 0 ? "+" : "-"}${s}%`;
}

function fmtVolume(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

type CoinRow = {
  symbol: string;
  base: string;
  lastPrice: number;
  changePct: number;
  quoteVolume: number;
};

function tradedPairToRow(p: TradedPair): CoinRow {
  return {
    symbol: p.symbol,
    base: p.base,
    lastPrice: p.lastPrice,
    changePct: p.changePct,
    quoteVolume: p.quoteVolume,
  };
}

function moverToRow(m: MoverRow): CoinRow {
  return {
    symbol: m.symbol,
    base: m.base,
    lastPrice: m.lastPrice,
    changePct: m.changePct,
    quoteVolume: m.quoteVolume,
  };
}

export function CoinBookScreen({
  onSelectTicker,
}: {
  onSelectTicker: (ticker: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("volume");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [volumeList, setVolumeList] = useState<CoinRow[]>([]);
  const [movers, setMovers] = useState<MoversSnapshot | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [pairs, snap] = await Promise.all([
        fetchTopTraded(200),
        fetchMovers(50),
      ]);
      setVolumeList(pairs.map(tradedPairToRow));
      setMovers(snap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar mercado.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    intervalRef.current = setInterval(() => void loadData(true), 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData]);

  function handleRefresh() {
    setRefreshing(true);
    void loadData(true);
  }

  const rows = useMemo(() => {
    let list: CoinRow[];
    switch (tab) {
      case "volume":
        list = volumeList;
        break;
      case "gainers":
        list = (movers?.gainers ?? []).map(moverToRow);
        break;
      case "losers":
        list = (movers?.losers ?? []).map(moverToRow);
        break;
      case "volatile":
        list = (movers?.byAbsChange ?? []).map(moverToRow);
        break;
    }

    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter((r) => r.base.includes(q) || r.symbol.includes(q));
    }

    return list;
  }, [tab, volumeList, movers, search]);

  const renderItem = useCallback(
    ({ item, index }: { item: CoinRow; index: number }) => (
      <CoinRowItem
        item={item}
        rank={tab === "volume" ? index + 1 : undefined}
        onPress={() => onSelectTicker(item.base)}
      />
    ),
    [tab, onSelectTicker],
  );

  const keyExtractor = useCallback((item: CoinRow) => item.symbol, []);

  return (
    <View style={styles.root}>
      <View style={styles.searchWrap}>
        <Search size={16} color={colors.subtle} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar moeda..."
          placeholderTextColor={colors.subtle}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8} style={styles.clearBtn}>
            <X size={14} color={colors.subtle} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
        <Pressable onPress={handleRefresh} hitSlop={8} style={styles.refreshBtn}>
          <RefreshCw
            size={14}
            color={refreshing ? colors.accent : colors.subtle}
          />
        </Pressable>
      </View>

      {loading && rows.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>Carregando mercado...</Text>
        </View>
      ) : error && rows.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void loadData()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rows}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.colRank}>#</Text>
              <Text style={[styles.colName, { flex: 1 }]}>Moeda</Text>
              <Text style={styles.colPrice}>Preço</Text>
              <Text style={styles.colChange}>24h</Text>
              <Text style={styles.colVol}>Volume</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {search ? `Nenhum resultado para "${search}"` : "Sem dados"}
              </Text>
            </View>
          }
          stickyHeaderIndices={[0]}
        />
      )}
    </View>
  );
}

function CoinRowItem({
  item,
  rank,
  onPress,
}: {
  item: CoinRow;
  rank?: number;
  onPress: () => void;
}) {
  const up = item.changePct >= 0;
  const changeColor = up ? colors.up : colors.down;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.colRank}>{rank ?? "-"}</Text>
      <View style={styles.nameCol}>
        <Text style={styles.baseTicker}>{item.base}</Text>
        <Text style={styles.quoteTicker}>USDT</Text>
      </View>
      <Text style={[styles.colPrice, styles.priceText]}>${fmtPrice(item.lastPrice)}</Text>
      <View style={[styles.changeBadge, { backgroundColor: up ? "rgba(125,155,122,0.15)" : "rgba(193,123,106,0.15)" }]}>
        {up ? (
          <ArrowUpRight size={10} color={changeColor} />
        ) : item.changePct === 0 ? (
          <Minus size={10} color={colors.muted} />
        ) : (
          <ArrowDownRight size={10} color={changeColor} />
        )}
        <Text style={[styles.changeText, { color: changeColor }]}>
          {fmtPct(item.changePct)}
        </Text>
      </View>
      <Text style={styles.volText}>{fmtVolume(item.quoteVolume)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 42,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: colors.fg,
    fontSize: 14,
    fontFamily: fonts.sans,
    height: 42,
    padding: 0,
  },
  clearBtn: { padding: 4 },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 4,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  tabActive: { backgroundColor: colors.accent },
  tabText: { fontSize: 12, fontWeight: "600", color: colors.muted },
  tabTextActive: { color: colors.accentFg },
  refreshBtn: { marginLeft: "auto", padding: 8 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: { fontSize: 13, color: colors.muted, marginTop: 8 },
  errorText: { fontSize: 13, color: colors.down, textAlign: "center", paddingHorizontal: 24 },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  retryText: { fontSize: 13, color: colors.accent, fontWeight: "600" },
  emptyText: { fontSize: 13, color: colors.muted },
  listContent: { paddingBottom: 80 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colRank: {
    width: 28,
    fontSize: 11,
    color: colors.subtle,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  colName: { fontSize: 11, color: colors.subtle, marginLeft: 4 },
  colPrice: {
    width: 80,
    fontSize: 11,
    color: colors.subtle,
    textAlign: "right",
  },
  colChange: { width: 64, fontSize: 11, color: colors.subtle, textAlign: "right" },
  colVol: { width: 56, fontSize: 11, color: colors.subtle, textAlign: "right" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  nameCol: { flex: 1, marginLeft: 4 },
  baseTicker: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.fg,
    fontFamily: fonts.sansSemiBold,
  },
  quoteTicker: { fontSize: 10, color: colors.subtle, marginTop: 1 },
  priceText: {
    fontSize: 13,
    color: colors.fg,
    fontVariant: ["tabular-nums"],
    fontWeight: "500",
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    width: 64,
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  changeText: {
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  volText: {
    width: 56,
    fontSize: 11,
    color: colors.muted,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
});
