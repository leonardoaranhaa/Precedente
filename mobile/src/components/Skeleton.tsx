import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";
import { colors, radius } from "../theme";

const SHIMMER_DURATION = 1200;

function Shimmer({ style }: { style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: SHIMMER_DURATION / 2,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: SHIMMER_DURATION / 2,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { backgroundColor: colors.surface, borderRadius: radius.sm, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonRow() {
  return (
    <View style={s.row}>
      <Shimmer style={s.circle} />
      <View style={s.rowContent}>
        <Shimmer style={s.lineShort} />
        <Shimmer style={s.lineMedium} />
      </View>
      <Shimmer style={s.badge} />
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={s.card}>
      <Shimmer style={s.cardTitle} />
      <Shimmer style={s.cardBody} />
      <Shimmer style={s.cardFooter} />
    </View>
  );
}

export function WatchSkeleton() {
  return (
    <View style={s.container}>
      <Shimmer style={s.sectionTitle} />
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

export function HistorySkeleton() {
  return (
    <View style={s.container}>
      <Shimmer style={s.sectionTitle} />
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  sectionTitle: { width: 120, height: 18, borderRadius: radius.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  circle: { width: 36, height: 36, borderRadius: 18 },
  rowContent: { flex: 1, gap: 6 },
  lineShort: { width: 80, height: 12, borderRadius: radius.xs },
  lineMedium: { width: 140, height: 10, borderRadius: radius.xs },
  badge: { width: 48, height: 22, borderRadius: radius.xl },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: 14,
    gap: 10,
  },
  cardTitle: { width: 100, height: 14, borderRadius: radius.xs },
  cardBody: { width: "100%", height: 60, borderRadius: radius.sm },
  cardFooter: { width: 160, height: 10, borderRadius: radius.xs },
});
