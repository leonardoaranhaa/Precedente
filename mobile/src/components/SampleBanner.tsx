import { StyleSheet, Text, View } from "react-native";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react-native";
import { colors, radius } from "../theme";
import { productBoundary, sampleBody, sampleTitle } from "../sample-copy";
import type { PrecedentResult } from "../types";

export function SampleBanner({
  sampleNote,
  matches,
}: {
  sampleNote: PrecedentResult["sampleNote"];
  matches: number;
}) {
  const tone =
    sampleNote === "tiny" ? colors.down : sampleNote === "small" ? colors.warn : colors.up;
  const bg =
    sampleNote === "tiny"
      ? "rgba(196,100,100,0.12)"
      : sampleNote === "small"
        ? "rgba(196,165,116,0.14)"
        : "rgba(125,155,122,0.14)";
  const Icon =
    sampleNote === "tiny" ? AlertTriangle : sampleNote === "small" ? Info : CheckCircle2;

  return (
    <View style={[styles.wrap, { backgroundColor: bg, borderColor: tone }]}>
      <Icon size={16} color={tone} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.title, { color: tone }]}>{sampleTitle(sampleNote)}</Text>
        <Text style={styles.body}>{sampleBody(sampleNote, matches)}</Text>
        <Text style={styles.boundary}>{productBoundary()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  title: { fontSize: 14, fontWeight: "600" },
  body: { fontSize: 13, lineHeight: 18, color: colors.fg },
  boundary: { fontSize: 11, lineHeight: 15, color: colors.muted },
});
