import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../theme";

export type ChartType = "candle" | "line" | "area";

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "candle", label: "Candles" },
  { value: "line", label: "Linha" },
  { value: "area", label: "Área" },
];

export function ChartToolbar({
  chartType,
  onChartType,
  showSma20,
  showSma50,
  onToggleSma20,
  onToggleSma50,
}: {
  chartType: ChartType;
  onChartType: (type: ChartType) => void;
  showSma20: boolean;
  showSma50: boolean;
  onToggleSma20: () => void;
  onToggleSma50: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.group}>
        {CHART_TYPES.map((ct) => (
          <Pressable
            key={ct.value}
            style={[styles.chip, chartType === ct.value && styles.chipActive]}
            onPress={() => onChartType(ct.value)}
          >
            <Text style={[styles.chipText, chartType === ct.value && styles.chipTextActive]}>
              {ct.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.group}>
        <Pressable
          style={[styles.chip, showSma20 && styles.indicatorActive]}
          onPress={onToggleSma20}
        >
          <View style={[styles.indicatorDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.chipText, showSma20 && styles.chipTextActive]}>20</Text>
        </Pressable>
        <Pressable
          style={[styles.chip, showSma50 && styles.indicatorActive]}
          onPress={onToggleSma50}
        >
          <View style={[styles.indicatorDot, { backgroundColor: colors.subtle }]} />
          <Text style={[styles.chipText, showSma50 && styles.chipTextActive]}>50</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  group: { flexDirection: "row", gap: 4 },
  chip: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  chipActive: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  chipText: { fontSize: 11, fontWeight: "500", color: colors.subtle },
  chipTextActive: { color: colors.fg },
  indicatorActive: {
    backgroundColor: colors.surface,
    borderColor: colors.muted,
  },
  indicatorDot: { width: 6, height: 6, borderRadius: 3 },
});
