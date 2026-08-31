import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../theme";

export function Badge({
  label,
  accent,
  warn,
}: {
  label: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <View
      style={[
        styles.badge,
        accent && { backgroundColor: "rgba(125,155,122,0.2)" },
        warn && { backgroundColor: "rgba(196,165,116,0.2)" },
      ]}
    >
      <Text
        style={[
          styles.text,
          accent && { color: colors.up },
          warn && { color: colors.warn },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.xl,
    backgroundColor: colors.bg,
  },
  text: { fontSize: 11, color: colors.muted, fontWeight: "500" },
});
