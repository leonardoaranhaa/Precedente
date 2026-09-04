import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, ChevronRight, Sprout } from "lucide-react-native";
import { colors, radius, spacing } from "../theme";
import type { DexFragilityReport, DexPairSnapshot, FragilityLevel } from "../types";

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

const LEVEL_LABEL: Record<FragilityLevel, string> = {
  extrema: "Fragilidade extrema",
  alta: "Fragilidade alta",
  media: "Fragilidade média",
  observavel: "Sem sinal de fragilidade",
};

type Props = {
  pair: DexPairSnapshot;
  fragility: DexFragilityReport;
  onPress: () => void;
};

/**
 * Linha compacta — o token não está na Binance, mas achamos ele no DEX.
 * Toca pra abrir a leitura completa em tela cheia (DexFragilityModal).
 * Mesma ideia da linha de par no screener do DexScreener: resumo curto,
 * o detalhe fica na página própria.
 */
export function DexFragilitySummary({ pair, fragility, onPress }: Props) {
  const color = LEVEL_COLOR[fragility.level];
  return (
    <Pressable style={styles.row} onPress={onPress}>
      {pair.imageUrl ? (
        <Image source={{ uri: pair.imageUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarWrap}>
          <Sprout size={14} color={colors.muted} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.ticker}>
          {pair.tokenSymbol ?? "Token"} · {price(pair.priceUsd)}
        </Text>
        <View style={styles.levelRow}>
          {fragility.level === "extrema" || fragility.level === "alta" ? (
            <AlertTriangle size={11} color={color} />
          ) : null}
          <Text style={[styles.level, { color }]}>{LEVEL_LABEL[fragility.level]}</Text>
        </View>
      </View>
      <ChevronRight size={18} color={colors.subtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    padding: spacing(3),
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgElevated },
  ticker: { color: colors.fg, fontSize: 13, fontVariant: ["tabular-nums"] },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  level: { fontSize: 11 },
});
