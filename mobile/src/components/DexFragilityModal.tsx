import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Share2, X } from "lucide-react-native";
import { colors, radius } from "../theme";
import { DexFragilityCard } from "./DexFragilityCard";
import type { DexFragilityReport, DexPairSnapshot } from "../types";

type Props = {
  visible: boolean;
  onClose: () => void;
  pair: DexPairSnapshot | null;
  fragility: DexFragilityReport | null;
  pinned?: boolean;
  onTogglePin?: () => void;
};

/**
 * Tela cheia pra leitura de fragilidade DEX — inspirada na pair page do
 * DexScreener (header fixo + compartilhar + conteúdo rolável), com nossos
 * componentes: mesmo shell de Modal do OhlcChartModal (pageSheet + slide),
 * o conteúdo é o DexFragilityCard que já existe, sem duplicar nada.
 */
export function DexFragilityModal({ visible, onClose, pair, fragility, pinned, onTogglePin }: Props) {
  if (!pair || !fragility) return null;

  const subtitle = [pair.chainId, pair.dexId].filter(Boolean).join(" · ");

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{pair.tokenSymbol ?? "Token"}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {pair.pairUrl ? (
            <Pressable
              onPress={() => void Linking.openURL(pair.pairUrl as string)}
              hitSlop={12}
              style={styles.iconBtn}
              accessibilityLabel="Abrir par no DexScreener"
            >
              <Share2 size={18} color={colors.fg} />
            </Pressable>
          ) : null}
          <Pressable onPress={onClose} hitSlop={12} style={styles.iconBtn} accessibilityLabel="Fechar">
            <X size={20} color={colors.fg} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <DexFragilityCard pair={pair} fragility={fragility} pinned={pinned} onTogglePin={onTogglePin} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg, paddingTop: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.fg },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 2 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 16, paddingBottom: 32 },
});
