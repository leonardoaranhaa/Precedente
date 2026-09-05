import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../theme";

export type ResultTab = "paths" | "risk" | "onchain" | "scenario" | "vision";

const TAB_LABELS: Record<ResultTab, string> = {
  paths: "Caminhos",
  risk: "Risco",
  onchain: "On-chain",
  scenario: "Cenário",
  vision: "Visão",
};

export function ResultTabs({
  active,
  onChange,
  tabs,
}: {
  active: ResultTab;
  onChange: (tab: ResultTab) => void;
  tabs: readonly ResultTab[];
}) {
  return (
    <View style={styles.strip}>
      {tabs.map((tab) => (
        <Pressable
          key={tab}
          onPress={() => onChange(tab)}
          style={[styles.tab, active === tab && styles.tabActive]}
        >
          <Text style={[styles.tabText, active === tab && styles.tabTextActive]}>
            {TAB_LABELS[tab]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    gap: 2,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: 3,
  },
  tab: {
    flex: 1,
    height: 34,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: colors.surface,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.fg,
  },
});
