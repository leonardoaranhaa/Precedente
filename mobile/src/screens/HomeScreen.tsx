import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { X, ImagePlus } from "lucide-react-native";
import { Button } from "../components/Button";
import { Pipeline, type PipelineStep } from "../components/Pipeline";
import { RiskLogPanel } from "../components/RiskLogPanel";
import { colors, radius } from "../theme";
import { fonts } from "../fonts";
import { DexFragilitySummary } from "../components/DexFragilitySummary";
import { POPULAR_TICKERS, TIMEFRAME_GROUPS, type DexReading, type Timeframe } from "../types";
import { normalizeTicker } from "../format";

export type PickedImage = { uri: string; width: number; height: number };

type Props = {
  ticker: string;
  timeframe: Timeframe;
  image: PickedImage | null;
  busy: boolean;
  step: PipelineStep;
  error: string | null;
  /** Leitura do DEX quando o token não tem histórico na Binance. */
  dexReading: DexReading | null;
  dexBusy: boolean;
  onOpenDexModal?: () => void;
  topTraded: string[];
  onTicker: (v: string) => void;
  onTimeframe: (v: Timeframe) => void;
  onImage: (v: PickedImage | null) => void;
  onSubmit: () => void;
};

export function HomeScreen({
  ticker,
  timeframe,
  image,
  busy,
  step,
  error,
  dexReading,
  dexBusy,
  onOpenDexModal,
  topTraded,
  onTicker,
  onTimeframe,
  onImage,
  onSubmit,
}: Props) {
  const [pickError, setPickError] = useState<string | null>(null);
  const current = normalizeTicker(ticker);
  // Ranking ao vivo por volume 24h; a lista fixa cobre a falha da rede.
  const chips = topTraded.length > 0 ? topTraded.slice(0, 6) : [...POPULAR_TICKERS.slice(0, 6)];

  async function pickImage() {
    setPickError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickError("Permissão de galeria negada — não dá pra escolher o print.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (!picked.canceled && picked.assets[0]) {
      const a = picked.assets[0];
      onImage({ uri: a.uri, width: a.width, height: a.height });
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>Print + ticker · nunca compre/venda</Text>
      <Text style={styles.title}>Quantas vezes isso já aconteceu?</Text>
      <Text style={styles.subtitle}>
        O print descreve o que se vê. A estatística vem do OHLC real: RSI, médias, e o que o
        preço fez depois das vezes anteriores.
      </Text>

      <RiskLogPanel />

      {busy ? (
        <Pipeline step={step} hasImage={Boolean(image)} />
      ) : (
        <View style={{ gap: 20 }}>
          <View style={{ gap: 8 }}>
            {image ? (
              <View style={styles.imageWrap}>
                <Image source={{ uri: image.uri }} style={styles.image} resizeMode="contain" />
                <Pressable style={styles.removeBtn} onPress={() => onImage(null)}>
                  <X size={16} color={colors.fg} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.uploadZone} onPress={pickImage}>
                <View style={styles.uploadIcon}>
                  <ImagePlus size={20} color={colors.accent} />
                </View>
                <Text style={styles.uploadTitle}>Envie o print do gráfico</Text>
                <Text style={styles.uploadHint}>
                  Toque pra escolher da galeria. Opcional — a estatística usa o OHLC real.
                </Text>
              </Pressable>
            )}
            {pickError ? <Text style={styles.errorText}>{pickError}</Text> : null}
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.label}>Par</Text>
            <TextInput
              value={ticker}
              onChangeText={onTicker}
              placeholder="BTC, ETHUSDT, SOL…"
              placeholderTextColor={colors.subtle}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
            />
            <View style={styles.chipRow}>
              {chips.map((t) => {
                const active = current === `${t}USDT` || current === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => onTicker(t)}
                    style={[styles.chip, active && { backgroundColor: colors.accent }]}
                  >
                    <Text style={[styles.chipText, active && { color: colors.accentFg }]}>
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.label}>Tempo gráfico</Text>
            <View style={styles.tfGroupsRow}>
              {TIMEFRAME_GROUPS.map((group) => (
                <View key={group.key} style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.tfGroupLabel}>{group.label}</Text>
                  <View style={styles.tfRow}>
                    {group.tfs.map((tf) => {
                      const active = timeframe === tf;
                      return (
                        <Pressable
                          key={tf}
                          onPress={() => onTimeframe(tf)}
                          style={[styles.tfButton, active && { backgroundColor: colors.bgElevated }]}
                        >
                          <Text style={[styles.tfText, active && { color: colors.fg }]}>{tf}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
          {dexBusy ? (
            <Text style={styles.dexHint}>Procurando este token no DEX…</Text>
          ) : null}
          {dexReading ? (
            <View style={styles.dexWrap}>
              <DexFragilitySummary
                pair={dexReading.pair}
                fragility={dexReading.fragility}
                onPress={() => onOpenDexModal?.()}
              />
            </View>
          ) : null}

          <Button
            title="Analisar"
            onPress={onSubmit}
            disabled={!ticker.trim()}
            loading={busy}
          />
          <Text style={styles.footnote}>Sem print, a análise usa só o histórico real do par.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, gap: 16 },
  eyebrow: { fontSize: 11, letterSpacing: 0.5, color: colors.muted, textTransform: "uppercase" },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 36,
    color: colors.fg,
  },
  subtitle: { fontSize: 14, lineHeight: 21, color: colors.muted, marginBottom: 4 },
  label: { fontSize: 11, letterSpacing: 0.5, color: colors.muted, textTransform: "uppercase" },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.fg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontSize: 12, fontWeight: "500", color: colors.muted },
  tfGroupsRow: {
    flexDirection: "row",
    gap: 6,
  },
  tfGroupLabel: {
    fontSize: 9,
    letterSpacing: 0.3,
    color: colors.subtle,
    textTransform: "uppercase",
  },
  tfRow: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
  },
  tfButton: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  tfText: { fontSize: 14, fontWeight: "500", color: colors.muted },
  uploadZone: {
    minHeight: 150,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  uploadIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: { fontSize: 14, fontWeight: "500", color: colors.fg },
  uploadHint: { fontSize: 12, color: colors.muted, textAlign: "center", maxWidth: 260 },
  imageWrap: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: 6,
    position: "relative",
  },
  image: { width: "100%", height: 200, borderRadius: radius.md },
  removeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: "rgba(12,12,10,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { fontSize: 12, color: colors.down },
  dexHint: { fontSize: 11, color: colors.subtle, marginTop: 8 },
  dexWrap: { marginTop: 12 },
  errorBanner: {
    backgroundColor: "rgba(193,123,106,0.12)",
    color: colors.down,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  footnote: { fontSize: 11, color: colors.subtle, textAlign: "center" },
});
