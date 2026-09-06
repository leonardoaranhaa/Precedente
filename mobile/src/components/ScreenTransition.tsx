import { useEffect, useRef, type ReactNode } from "react";
import { Animated, StyleSheet } from "react-native";

export function ScreenTransition({ children, screenKey }: { children: ReactNode; screenKey: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const prevKey = useRef(screenKey);

  useEffect(() => {
    if (prevKey.current !== screenKey) {
      opacity.setValue(0);
      translateY.setValue(8);
      prevKey.current = screenKey;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [screenKey, opacity, translateY]);

  return (
    <Animated.View style={[s.fill, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
});
