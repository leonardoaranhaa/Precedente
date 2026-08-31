import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../theme";

const STEPS = [
  { id: "ohlc", label: "OHLC real na Binance" },
  { id: "stats", label: "RSI, médias, precedentes" },
  { id: "vision", label: "Leitura visual do print" },
] as const;

export type PipelineStep = (typeof STEPS)[number]["id"] | "done";

export function Pipeline({ step, hasImage }: { step: PipelineStep; hasImage: boolean }) {
  const visible = hasImage ? STEPS : STEPS.filter((s) => s.id !== "vision");
  const order = visible.map((s) => s.id);
  const currentIdx = step === "done" ? order.length : Math.max(0, order.indexOf(step as "ohlc"));

  return (
    <View style={styles.card}>
      {visible.map((s, i) => {
        const done = i < currentIdx || step === "done";
        const active = i === currentIdx && step !== "done";
        return (
          <View key={s.id} style={styles.row}>
            <View
              style={[
                styles.bullet,
                done && { backgroundColor: colors.accent },
                active && { backgroundColor: colors.bg },
              ]}
            >
              {active ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={[styles.bulletText, done && { color: colors.accentFg }]}>
                  {done ? "✓" : i + 1}
                </Text>
              )}
            </View>
            <Text style={[styles.label, active && { color: colors.fg }]}>{s.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 14,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  bullet: {
    width: 32,
    height: 32,
    borderRadius: radius.xs,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  bulletText: { color: colors.subtle, fontSize: 12 },
  label: { color: colors.muted, fontSize: 14, flexShrink: 1 },
});
