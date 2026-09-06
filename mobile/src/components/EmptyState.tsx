import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { colors, radius } from "../theme";

type Variant = "watch" | "history" | "search";

function WatchIllustration() {
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
      <Circle cx={40} cy={40} r={36} stroke={colors.border} strokeWidth={1.5} />
      <Circle cx={40} cy={40} r={28} stroke={colors.border} strokeWidth={1} strokeDasharray="4 4" />
      <Path d="M28 48 L36 38 L44 42 L52 30" stroke={colors.up} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={52} cy={30} r={3} fill={colors.up} opacity={0.6} />
      <Line x1={26} y1={55} x2={54} y2={55} stroke={colors.border} strokeWidth={1} />
      <Rect x={28} y={57} width={8} height={4} rx={1} fill={colors.surface} />
      <Rect x={38} y={57} width={12} height={4} rx={1} fill={colors.surface} />
    </Svg>
  );
}

function HistoryIllustration() {
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
      <Rect x={16} y={18} width={48} height={10} rx={4} fill={colors.surface} />
      <Rect x={19} y={21} width={20} height={4} rx={2} fill={colors.border} />
      <Rect x={16} y={32} width={48} height={10} rx={4} fill={colors.surface} />
      <Rect x={19} y={35} width={16} height={4} rx={2} fill={colors.border} />
      <Rect x={16} y={46} width={48} height={10} rx={4} fill={colors.surface} opacity={0.6} />
      <Rect x={19} y={49} width={24} height={4} rx={2} fill={colors.border} opacity={0.5} />
      <Rect x={16} y={60} width={48} height={10} rx={4} fill={colors.surface} opacity={0.3} />
      <Rect x={19} y={63} width={12} height={4} rx={2} fill={colors.border} opacity={0.3} />
    </Svg>
  );
}

function SearchIllustration() {
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
      <Circle cx={36} cy={36} r={18} stroke={colors.border} strokeWidth={2} />
      <Line x1={49} y1={49} x2={62} y2={62} stroke={colors.border} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M28 36 L33 31 L38 34 L43 28" stroke={colors.accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
    </Svg>
  );
}

const ILLUSTRATIONS: Record<Variant, () => React.JSX.Element> = {
  watch: WatchIllustration,
  history: HistoryIllustration,
  search: SearchIllustration,
};

export function EmptyState({
  variant,
  title,
  hint,
}: {
  variant: Variant;
  title: string;
  hint: string;
}) {
  const Illustration = ILLUSTRATIONS[variant];
  return (
    <View style={s.container}>
      <Illustration />
      <Text style={s.title}>{title}</Text>
      <Text style={s.hint}>{hint}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.muted,
    textAlign: "center",
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.subtle,
    textAlign: "center",
    maxWidth: 280,
  },
});
