import { StyleSheet, Text, View } from "react-native";
import type { HorizonOutcome } from "../types";
import { colors, radius } from "../theme";

export function SplitBar({ horizon }: { horizon: HorizonOutcome }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.track}>
        <View style={[styles.segment, { flexGrow: horizon.upPct, backgroundColor: colors.up }]} />
        <View
          style={[styles.segment, { flexGrow: horizon.flatPct, backgroundColor: colors.subtle }]}
        />
        <View
          style={[styles.segment, { flexGrow: horizon.downPct, backgroundColor: colors.down }]}
        />
      </View>
      <View style={styles.stats}>
        <Stat label="subiu" value={horizon.upPct} color={colors.up} />
        <Stat label="lateral" value={horizon.flatPct} color={colors.fg} />
        <Stat label="caiu" value={horizon.downPct} color={colors.down} />
      </View>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{Math.round(value)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radius.xs,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: colors.bg,
  },
  segment: { height: "100%" },
  stats: { flexDirection: "row" },
  statLabel: { fontSize: 11, color: colors.muted },
  statValue: { marginTop: 2, fontSize: 13, fontVariant: ["tabular-nums"] },
});
