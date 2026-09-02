import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { X } from "lucide-react-native";
import { colors, radius } from "../theme";
import { formatPrice } from "../format";
import type { PriceZone, RsiZone, WatchItem } from "../watchlist";

const RSI_BELOW_OPTIONS = [20, 30, 40] as const;
const RSI_ABOVE_OPTIONS = [60, 70, 80] as const;

const EMPTY_PRICE_ZONE: PriceZone = { enabled: false, min: null, max: null };
const EMPTY_RSI_ZONE: RsiZone = { enabled: false, below: null, above: null };

/**
 * Configura, por ativo, uma zona de preço e/ou de RSI que dispara push fora
 * das 3 regras globais — pensado pra quem precisa se afastar da tela e
 * quer saber só quando o ativo entrar numa faixa específica.
 */
export function ZoneModal({
  visible,
  item,
  onClose,
  onSave,
}: {
  visible: boolean;
  item: WatchItem | null;
  onClose: () => void;
  onSave: (zones: { priceZone: PriceZone; rsiZone: RsiZone }) => void;
}) {
  const [priceZone, setPriceZone] = useState<PriceZone>(EMPTY_PRICE_ZONE);
  const [rsiZone, setRsiZone] = useState<RsiZone>(EMPTY_RSI_ZONE);
  const [minText, setMinText] = useState("");
  const [maxText, setMaxText] = useState("");

  useEffect(() => {
    if (!item) return;
    const pz = item.priceZone ?? EMPTY_PRICE_ZONE;
    setPriceZone(pz);
    setMinText(pz.min != null ? String(pz.min) : "");
    setMaxText(pz.max != null ? String(pz.max) : "");
    setRsiZone(item.rsiZone ?? EMPTY_RSI_ZONE);
  }, [item]);

  if (!item) return null;

  function parseNum(text: string): number | null {
    const n = Number(text.replace(",", "."));
    return text.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
  }

  function save() {
    onSave({
      priceZone: { ...priceZone, min: parseNum(minText), max: parseNum(maxText) },
      rsiZone,
    });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Zona de alerta</Text>
              <Text style={styles.subtitle}>
                {item.displayTicker} · preço atual {formatPrice(item.price)}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Fechar">
              <X size={20} color={colors.subtle} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: 18 }}>
            <View style={styles.section}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Zona de preço</Text>
                <Switch
                  value={priceZone.enabled}
                  onValueChange={(v) => setPriceZone((p) => ({ ...p, enabled: v }))}
                  trackColor={{ false: colors.border, true: colors.warn }}
                  thumbColor={colors.fg}
                />
              </View>
              <Text style={styles.hint}>
                Avisa quando o preço fechar dentro da faixa. Deixe um dos dois em branco pra faixa
                aberta (só piso, ou só teto).
              </Text>
              <View style={styles.rowGap}>
                <TextInput
                  value={minText}
                  onChangeText={setMinText}
                  placeholder="Mínimo"
                  placeholderTextColor={colors.subtle}
                  keyboardType="decimal-pad"
                  editable={priceZone.enabled}
                  style={[styles.input, !priceZone.enabled && styles.inputDisabled]}
                />
                <TextInput
                  value={maxText}
                  onChangeText={setMaxText}
                  placeholder="Máximo"
                  placeholderTextColor={colors.subtle}
                  keyboardType="decimal-pad"
                  editable={priceZone.enabled}
                  style={[styles.input, !priceZone.enabled && styles.inputDisabled]}
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Zona de RSI</Text>
                <Switch
                  value={rsiZone.enabled}
                  onValueChange={(v) => setRsiZone((p) => ({ ...p, enabled: v }))}
                  trackColor={{ false: colors.border, true: colors.warn }}
                  thumbColor={colors.fg}
                />
              </View>
              <Text style={styles.hint}>Avisa quando o RSI cruzar um dos limites abaixo.</Text>

              <Text style={styles.chipLabel}>Abaixo de</Text>
              <View style={styles.chipRow}>
                {RSI_BELOW_OPTIONS.map((n) => (
                  <Pressable
                    key={n}
                    disabled={!rsiZone.enabled}
                    onPress={() =>
                      setRsiZone((p) => ({ ...p, below: p.below === n ? null : n }))
                    }
                    style={[styles.chip, rsiZone.below === n && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, rsiZone.below === n && styles.chipTextOn]}>
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.chipLabel}>Acima de</Text>
              <View style={styles.chipRow}>
                {RSI_ABOVE_OPTIONS.map((n) => (
                  <Pressable
                    key={n}
                    disabled={!rsiZone.enabled}
                    onPress={() =>
                      setRsiZone((p) => ({ ...p, above: p.above === n ? null : n }))
                    }
                    style={[styles.chip, rsiZone.above === n && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, rsiZone.above === n && styles.chipTextOn]}>
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          <Pressable style={styles.saveBtn} onPress={save}>
            <Text style={styles.saveBtnText}>Salvar zona</Text>
          </Pressable>
        </View>
      </View>
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
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  title: { fontSize: 18, fontWeight: "600", color: colors.fg },
  subtitle: { fontSize: 12, color: colors.subtle, marginTop: 2 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    gap: 10,
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowGap: { flexDirection: "row", gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: colors.fg },
  hint: { fontSize: 12, color: colors.subtle, lineHeight: 17 },
  input: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    color: colors.fg,
    fontSize: 14,
  },
  inputDisabled: { opacity: 0.4 },
  chipLabel: { fontSize: 11, color: colors.subtle, marginTop: 4 },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.xl,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: colors.accent },
  chipText: { fontSize: 13, color: colors.muted, fontVariant: ["tabular-nums"] },
  chipTextOn: { color: colors.accentFg, fontWeight: "600" },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: colors.accentFg, fontWeight: "600", fontSize: 14 },
});
