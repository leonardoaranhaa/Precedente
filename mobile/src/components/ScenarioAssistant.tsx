import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MessageCircle, Sparkles, X } from "lucide-react-native";
import { narrateScenario } from "../narrate";
import { colors, radius } from "../theme";
import type { StoredAnalysis } from "../types";

export function ScenarioAssistant({ analysis }: { analysis: StoredAnalysis | null }) {
  const [open, setOpen] = useState(false);
  const narrative = useMemo(
    () => (analysis ? narrateScenario(analysis) : null),
    [analysis],
  );

  if (!analysis || !narrative) return null;

  return (
    <>
      <View style={styles.fabWrap} pointerEvents="box-none">
        <Pressable
          style={[styles.fab, open && styles.fabOpen]}
          onPress={() => setOpen(true)}
          accessibilityLabel="Ler o cenário"
        >
          <MessageCircle size={18} color={open ? colors.fg : colors.accentFg} />
          <Text style={[styles.fabText, open && { color: colors.fg }]}>Ler o cenário</Text>
        </Pressable>
      </View>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.iconCircle}>
                <Sparkles size={16} color={colors.warn} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.eyebrow}>Assistente de cenário</Text>
                <Text style={styles.headline} numberOfLines={2}>
                  {narrative.headline}
                </Text>
              </View>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={10}
                accessibilityLabel="Fechar"
                style={styles.closeBtn}
              >
                <X size={18} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.body}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.hint}>
                Leitura descritiva do que está na tela e do que o histórico parecido costumava
                fazer. Não orienta exposição.
              </Text>
              {narrative.paragraphs.map((p, i) => (
                <Text key={i} style={styles.paragraph}>
                  {p}
                </Text>
              ))}
              <Text style={styles.footer}>{narrative.footer}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: "absolute",
    right: 16,
    bottom: 24,
    zIndex: 40,
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabOpen: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accentFg,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "78%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(196,165,116,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.muted,
    textTransform: "uppercase",
  },
  headline: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.fg,
    marginTop: 2,
  },
  closeBtn: { padding: 4 },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 12,
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.subtle,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.fg,
  },
  footer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    fontSize: 11,
    lineHeight: 16,
    color: colors.subtle,
  },
});
