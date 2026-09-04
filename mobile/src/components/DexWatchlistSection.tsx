import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Sprout, TrendingDown } from "lucide-react-native";
import { colors, radius, spacing } from "../theme";
import type { DexWatchItem } from "../dex-watchlist";
import type { FragilityLevel } from "../types";

function usd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function price(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n >= 1 ? `$${n.toFixed(4)}` : `$${n.toPrecision(4)}`;
}

const LEVEL_COLOR: Record<FragilityLevel, string> = {
  extrema: colors.down,
  alta: colors.warn,
  media: colors.warn,
  observavel: colors.muted,
};

const LEVEL_SHORT: Record<FragilityLevel, string> = {
  extrema: "Extrema",
  alta: "Alta",
  media: "Média",
  observavel: "—",
};

type Props = {
  items: DexWatchItem[];
  onOpen: (ticker: string) => void;
  onUnpin: (ticker: string) => void;
};

/**
 * Lista separada da Watch — tokens DEX pinados pro alerta de drenagem.
 * Sem timeframe, sem amostra: não é o motor de precedente, é o motor de
 * fragilidade. Ver docs/dex-arquitetura.md.
 */
export function DexWatchlistSection({ items, onOpen, onUnpin }: Props) {
  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <TrendingDown size={18} color={colors.subtle} />
        <Text style={styles.emptyTitle}>Nenhuma moeda volátil pinada.</Text>
        <Text style={styles.emptyHint}>
          Ao analisar um token sem histórico na Binance, toque em "+ Voláteis" na
          leitura de fragilidade pra receber alerta se o fluxo piorar.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Moedas voláteis</Text>
        <Text style={styles.subtitle}>
          Ciclo curto, sem precedente — alerta só quando o fluxo piora.
        </Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.ticker}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => onOpen(item.ticker)}>
            <View style={styles.rowLeft}>
              <View style={styles.tickerRow}>
                <Text style={styles.ticker}>{item.ticker}</Text>
                <Sprout size={11} color={colors.muted} />
              </View>
              {item.tokenName ? (
                <Text style={styles.tokenName} numberOfLines={1}>
                  {item.tokenName}
                </Text>
              ) : null}
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.price}>{price(item.priceUsd)}</Text>
              <Text style={styles.liq}>liq {usd(item.liquidityUsd)}</Text>
            </View>
            <View style={styles.levelCol}>
              <Text style={[styles.level, { color: LEVEL_COLOR[item.level] }]}>
                {LEVEL_SHORT[item.level]}
              </Text>
            </View>
            <Pressable
              hitSlop={10}
              onPress={() => onUnpin(item.ticker)}
              accessibilityLabel={`Remover ${item.ticker} da lista de voláteis`}
            >
              <Text style={styles.unpin}>✕</Text>
            </Pressable>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing(4),
  },
  header: { padding: spacing(3), borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.fg, fontSize: 14, fontWeight: "600" },
  subtitle: { color: colors.subtle, fontSize: 11, marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
  },
  rowLeft: { flex: 1.4 },
  tickerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ticker: { color: colors.fg, fontSize: 13, fontVariant: ["tabular-nums"] },
  tokenName: { color: colors.subtle, fontSize: 10, marginTop: 1 },
  rowRight: { flex: 1, alignItems: "flex-end" },
  price: { color: colors.fg, fontSize: 12, fontVariant: ["tabular-nums"] },
  liq: { color: colors.subtle, fontSize: 10, marginTop: 1 },
  levelCol: { width: 56, alignItems: "flex-end" },
  level: { fontSize: 11, fontWeight: "600" },
  unpin: { color: colors.subtle, fontSize: 14, paddingHorizontal: 4 },
  sep: { height: 1, backgroundColor: colors.border },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
    alignItems: "center",
    gap: spacing(1.5),
    marginBottom: spacing(4),
  },
  emptyTitle: { color: colors.fg, fontSize: 13, fontWeight: "500" },
  emptyHint: { color: colors.subtle, fontSize: 11, textAlign: "center", lineHeight: 16 },
});
