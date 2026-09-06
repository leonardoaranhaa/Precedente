import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { WifiOff } from "lucide-react-native";
import { colors, radius } from "../theme";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOffline = state.isConnected === false;
      setOffline(isOffline);
      Animated.timing(opacity, {
        toValue: isOffline ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
    return unsubscribe;
  }, [opacity]);

  if (!offline) return null;

  return (
    <Animated.View style={[s.banner, { opacity }]}>
      <WifiOff size={14} color={colors.warn} />
      <Text style={s.text}>Sem conexão</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(196,165,116,0.15)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 14,
    marginBottom: 4,
    borderRadius: radius.sm,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.warn,
  },
});
