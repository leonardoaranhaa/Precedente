import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MessageCircle, Sparkles, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ASSISTANT_QUESTIONS,
  answerAssistantQuestion,
  type AssistantQuestionId,
} from "../assistant-qa";
import { narrateScenario } from "../narrate";
import { colors, radius } from "../theme";
import type { StoredAnalysis } from "../types";

export function ScenarioAssistant({ analysis }: { analysis: StoredAnalysis | null }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(true);
  const [qaId, setQaId] = useState<AssistantQuestionId | null>(null);
  const narrative = useMemo(
    () => (analysis ? narrateScenario(analysis) : null),
    [analysis],
  );

  const qaAnswer = useMemo(() => {
    if (!analysis || !qaId) return null;
    return answerAssistantQuestion(analysis, qaId);
  }, [analysis, qaId]);

  useEffect(() => {
    if (!analysis) return;
    setHint(true);
    setQaId(null);
  }, [analysis?.id]);

  if (!analysis || !narrative) return null;

  const weak = analysis.precedent.sampleNote !== "ok";

  return (
    <>
      <View
        style={[styles.fabWrap, { bottom: 24 + insets.bottom, right: 16 + insets.right }]}
        pointerEvents="box-none"
      >
        {!open && hint ? (
          <Pressable
            onPress={() => {
              setOpen(true);
              setHint(false);
            }}
            style={[styles.hint, weak && styles.hintWeak]}
          >
            <Text style={styles.hintText}>
              {weak
                ? "Amostra frágil — toque para ler o cenário e o aviso de cautela."
                : "Toque para ler o cenário em português."}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.fab, open && styles.fabOpen, !open && weak && styles.fabWeak]}
          onPress={() => {
            setOpen(true);
            setHint(false);
          }}
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
                <Text style={styles.eyebrow}>Leitura do cenário</Text>
                <Text style={styles.headline} numberOfLines={2}>
                  {narrative.headline}
                </Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} style={styles.closeBtn}>
                <X size={18} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.qaRow}>
              {ASSISTANT_QUESTIONS.map((q) => (
                <Pressable
                  key={q.id}
                  onPress={() => setQaId(q.id)}
                  style={[styles.qaChip, qaId === q.id && styles.qaChipOn]}
                >
                  <Text style={[styles.qaChipText, qaId === q.id && { color: colors.accentFg }]}>
                    {q.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView
              contentContainerStyle={[styles.body, { paddingBottom: 16 + insets.bottom }]}
              showsVerticalScrollIndicator={false}
            >
              {qaAnswer ? (
                <Text style={styles.qaAnswer}>{qaAnswer}</Text>
              ) : (
                <Text style={styles.hintBody}>
                  Use os atalhos acima (caminho, amostra, liquidez). Texto só com os números desta
                  análise — não é chat livre.
                </Text>
              )}
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
    alignItems: "flex-end",
    gap: 8,
  },
  hint: {
    maxWidth: 220,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hintWeak: {
    backgroundColor: "rgba(196,165,116,0.18)",
    borderColor: colors.warn,
  },
  hintText: { fontSize: 11, lineHeight: 15, color: colors.fg },
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
  fabWeak: {
    borderWidth: 2,
    borderColor: colors.warn,
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
  qaRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  qaChip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  qaChipOn: { backgroundColor: colors.accent },
  qaChipText: { fontSize: 11, fontWeight: "500", color: colors.muted },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 12,
  },
  qaAnswer: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.fg,
    backgroundColor: colors.bg,
    padding: 12,
    borderRadius: radius.md,
  },
  hintBody: {
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
