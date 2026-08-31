import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../theme";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "ghost";
};

export function Button({ title, onPress, disabled, loading, variant = "primary" }: Props) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        (disabled || loading) && { opacity: 0.5 },
        pressed && !disabled && !loading && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator color={isPrimary ? colors.accentFg : colors.fg} size="small" />
          <Text style={isPrimary ? styles.primaryText : styles.ghostText}>{title}</Text>
        </View>
      ) : (
        <Text style={isPrimary ? styles.primaryText : styles.ghostText}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primary: { backgroundColor: colors.accent },
  ghost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  primaryText: { color: colors.accentFg, fontSize: 15, fontWeight: "700" },
  ghostText: { color: colors.fg, fontSize: 15, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});
