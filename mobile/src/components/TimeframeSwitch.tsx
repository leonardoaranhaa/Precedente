import { Pressable, StyleSheet, Text, View } from "react-native";
import { TIMEFRAME_GROUPS, type Timeframe } from "../types";
import { timeframeLabel } from "../format";
import { colors, radius } from "../theme";

export function TimeframeSwitch({
  current,
  disabled,
  onChange,
}: {
  current: Timeframe;
  disabled?: boolean;
  onChange: (tf: Timeframe) => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Momento gráfico · mesmo par</Text>
      <View style={styles.groupsRow}>
        {TIMEFRAME_GROUPS.map((group) => (
          <View key={group.key} style={{ flex: 1, gap: 3 }}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.row}>
              {group.tfs.map((tf) => {
                const active = tf === current;
                return (
                  <Pressable
                    key={tf}
                    disabled={disabled}
                    onPress={() => {
                      if (tf === current || disabled) return;
                      onChange(tf);
                    }}
                    style={[styles.chip, active && styles.chipOn, disabled && { opacity: 0.55 }]}
                    accessibilityLabel={`Reanalisar em ${timeframeLabel(tf)}`}
                  >
                    <Text style={[styles.chipText, active && { color: colors.accentFg }]}>
                      {tf}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.hint}>
        Trocar o TF busca candles novos e recalcula precedentes — não é só filtro visual.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: 10,
    letterSpacing: 0.3,
    color: colors.subtle,
    textTransform: "uppercase",
  },
  groupsRow: {
    flexDirection: "row",
    gap: 6,
  },
  groupLabel: {
    fontSize: 9,
    letterSpacing: 0.3,
    color: colors.subtle,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: 4,
    flex: 1,
  },
  chip: {
    flexGrow: 1,
    minWidth: 44,
    height: 34,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: colors.accent },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.muted },
  hint: { fontSize: 11, lineHeight: 15, color: colors.subtle },
});
