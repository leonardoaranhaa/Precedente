import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../theme";

export function Badge({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <View style={[styles.badge, accent && { backgroundColor: colors.accent }]}>
      <Text style={[styles.text, accent && { color: colors.accentFg }]}>{label}</Text>
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
  text: { fontSize: 11, color: colors.muted },
});
