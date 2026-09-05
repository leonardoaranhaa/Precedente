import { StyleSheet, Text, View } from "react-native";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react-native";
import { colors, radius } from "../theme";
import { productBoundary, sampleBody, sampleTitle } from "../sample-copy";
import type { PrecedentResult } from "../types";

/**
 * `tiny` precisa ser impossível de ignorar: os números abaixo são
 * ilustração, não estatística — borda mais grossa e um selo de alerta
 * evitam que passe com o mesmo peso visual de "amostra razoável".
 */
export function SampleBanner({
  sampleNote,
  matches,
  compact = false,
}: {
  sampleNote: PrecedentResult["sampleNote"];
  matches: number;
  compact?: boolean;
}) {
  const tiny = sampleNote === "tiny";
  const tone =
    sampleNote === "tiny" ? colors.down : sampleNote === "small" ? colors.warn : colors.up;
  const bg =
    sampleNote === "tiny"
      ? "rgba(196,100,100,0.16)"
      : sampleNote === "small"
        ? "rgba(196,165,116,0.14)"
        : "rgba(125,155,122,0.14)";
  const Icon =
    sampleNote === "tiny" ? AlertTriangle : sampleNote === "small" ? Info : CheckCircle2;

  if (compact) {
    return (
      <View
        style={[
          styles.wrap,
          { backgroundColor: bg, borderColor: tone, borderWidth: 1, paddingVertical: 10 },
        ]}
      >
        <Icon size={14} color={tone} />
        <Text style={[styles.title, { color: tone, fontSize: 12 }]} numberOfLines={1}>
          {sampleTitle(sampleNote)} · n={matches}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: bg, borderColor: tone, borderWidth: tiny ? 2 : 1 },
      ]}
    >
      <Icon size={tiny ? 18 : 16} color={tone} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 4 }}>
        {tiny ? <Text style={styles.eyebrow}>Leia antes de confiar nos números</Text> : null}
        <Text style={[styles.title, { color: tone }, tiny && styles.titleTiny]}>
          {sampleTitle(sampleNote)}
        </Text>
        <Text style={[styles.body, tiny && styles.bodyTiny]}>{sampleBody(sampleNote, matches)}</Text>
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
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: colors.down,
    textTransform: "uppercase",
  },
  title: { fontSize: 14, fontWeight: "600" },
  titleTiny: { fontSize: 15 },
  body: { fontSize: 13, lineHeight: 18, color: colors.fg },
  bodyTiny: { fontWeight: "500" },
  boundary: { fontSize: 11, lineHeight: 15, color: colors.muted },
});
