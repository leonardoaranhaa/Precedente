import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { colors, radius } from "../theme";
import {
  getMyNewsPreferences,
  KNOWN_COINS,
  NEWS_CATEGORIES,
  saveMyNewsPreferences,
  type NewsCategory,
  type NewsPreferences,
} from "../news";

/**
 * Preferências de notícias — mesma moeda + categoria da versão web. Igual ao
 * ZoneModal, sem estado global: abre, carrega, edita, salva, fecha.
 */
export function NewsPreferencesModal({
  visible,
  signedIn,
  onClose,
  onSaved,
}: {
  visible: boolean;
  signedIn: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [coins, setCoins] = useState<string[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !signedIn) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMyNewsPreferences()
      .then((prefs) => {
        if (cancelled || !prefs) return;
        setCoins(prefs.coins);
        setCategories(prefs.categories);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar suas preferências.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, signedIn]);

  function toggleCoin(coin: string) {
    setCoins((cs) => (cs.includes(coin) ? cs.filter((c) => c !== coin) : [...cs, coin]));
  }

  function toggleCategory(category: NewsCategory) {
    setCategories((cs) => (cs.includes(category) ? cs.filter((c) => c !== category) : [...cs, category]));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const saved: NewsPreferences = await saveMyNewsPreferences({ coins, categories });
      setCoins(saved.coins);
      setCategories(saved.categories);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Preferências de notícias</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Fechar">
              <X size={20} color={colors.subtle} />
            </Pressable>
          </View>

          {!signedIn ? (
            <Text style={styles.hint}>Entre na sua conta (aba Conta) pra escolher moedas e categorias.</Text>
          ) : (
            <ScrollView contentContainerStyle={{ gap: 18 }}>
              <Text style={styles.hint}>
                Escolha o que acompanhar — deixe tudo desmarcado pra ver todas as notícias.
              </Text>

              <View>
                <Text style={styles.sectionTitle}>Moedas</Text>
                <View style={styles.chipRow}>
                  {KNOWN_COINS.map((coin) => (
                    <Pressable
                      key={coin}
                      onPress={() => toggleCoin(coin)}
                      style={[styles.chip, coins.includes(coin) && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, coins.includes(coin) && styles.chipTextOn]}>
                        {coin}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.sectionTitle}>Categorias</Text>
                <View style={styles.chipRow}>
                  {NEWS_CATEGORIES.map(({ id, label }) => (
                    <Pressable
                      key={id}
                      onPress={() => toggleCategory(id)}
                      style={[styles.chip, categories.includes(id) && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, categories.includes(id) && styles.chipTextOn]}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                style={[styles.saveBtn, (saving || loading) && { opacity: 0.6 }]}
                onPress={() => void save()}
                disabled={saving || loading}
              >
                <Text style={styles.saveBtnText}>{saving ? "Salvando…" : "Salvar"}</Text>
              </Pressable>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "85%",
    gap: 16,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 18, fontWeight: "600", color: colors.fg },
  hint: { fontSize: 12, color: colors.subtle, lineHeight: 17 },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: colors.fg, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: colors.accent },
  chipText: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  chipTextOn: { color: colors.accentFg, fontWeight: "600" },
  error: { fontSize: 12, color: colors.down },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: colors.accentFg, fontWeight: "600", fontSize: 14 },
});
