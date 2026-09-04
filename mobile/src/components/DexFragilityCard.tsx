import { useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, ExternalLink, Sprout } from "lucide-react-native";
import { colors, radius, spacing } from "../theme";
import type { DexFragilityReport, DexPairSnapshot, DexWindow } from "../types";

const WINDOWS = [
  { key: "m5", label: "5M" },
  { key: "h1", label: "1H" },
  { key: "h6", label: "6H" },
  { key: "h24", label: "24H" },
] as const;

type WindowKey = (typeof WINDOWS)[number]["key"];

function usd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

/** Token de ciclo curto costuma ter muitas casas — não arredondar pra zero. */
function price(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n >= 1 ? `$${n.toFixed(4)}` : `$${n.toPrecision(4)}`;
}

function pct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2).replace(".", ",")}%`;
}

function age(hours: number | null): string {
  if (hours == null || !Number.isFinite(hours)) return "—";
  return hours < 48 ? `${Math.round(hours)}h` : `${Math.round(hours / 24)}d`;
}

function count(n: number | null): string {
  return n == null ? "—" : n.toLocaleString("pt-BR");
}

const LEVEL_LABEL: Record<DexFragilityReport["level"], string> = {
  extrema: "Fragilidade extrema",
  alta: "Fragilidade alta",
  media: "Fragilidade média",
  observavel: "Sem sinal de fragilidade",
};

type Props = { pair: DexPairSnapshot; fragility: DexFragilityReport };

/**
 * Paridade com dex-fragility-panel.tsx do web. NÃO é a tela de precedente:
 * um par de horas não tem histórico de candles pra estatística de caminho.
 */
export function DexFragilityCard({ pair, fragility }: Props) {
  const [win, setWin] = useState<WindowKey>("h24");
  const w: DexWindow = pair[win];

  const total = (w.buys ?? 0) + (w.sells ?? 0);
  const buyShare = total > 0 ? (w.buys ?? 0) / total : null;

  const levelColor =
    fragility.level === "extrema"
      ? colors.down
      : fragility.level === "alta" || fragility.level === "media"
        ? colors.warn
        : colors.muted;

  const saida =
    fragility.metrics.liqToMcap == null
      ? "—"
      : `${(fragility.metrics.liqToMcap * 100)
          .toFixed(fragility.metrics.liqToMcap < 0.01 ? 2 : 0)
          .replace(".", ",")}%`;

  const subtitle = [pair.tokenName, pair.chainId, pair.dexId, ...pair.labels]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          {pair.imageUrl ? (
            <Image source={{ uri: pair.imageUrl }} style={styles.avatar} />
          ) : null}
          <View style={styles.headText}>
            <View style={styles.titleRow}>
              <Text style={styles.symbol}>
                {pair.tokenSymbol ?? "—"}
                {pair.quoteSymbol ? (
                  <Text style={styles.quote}>/{pair.quoteSymbol}</Text>
                ) : null}
              </Text>
              {pair.pairAgeHours != null ? (
                <View style={styles.ageRow}>
                  <Sprout size={11} color={colors.muted} />
                  <Text style={styles.age}>{age(pair.pairAgeHours)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>
        {pair.pairUrl ? (
          <Pressable
            hitSlop={10}
            accessibilityLabel="Abrir par no DexScreener"
            onPress={() => void Linking.openURL(pair.pairUrl as string)}
          >
            <ExternalLink size={14} color={colors.subtle} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.levelRow}>
        {fragility.level === "extrema" || fragility.level === "alta" ? (
          <AlertTriangle size={13} color={levelColor} />
        ) : null}
        <Text style={[styles.level, { color: levelColor }]}>
          {LEVEL_LABEL[fragility.level]}
        </Text>
      </View>

      <View style={styles.grid}>
        <Cell label="Preço" value={price(pair.priceUsd)} />
        <Cell label="Liquidez" value={usd(pair.liquidityUsd)} />
        <Cell label="Market cap" value={usd(pair.marketCapUsd)} />
        <Cell
          label="Saída"
          value={saida}
          tone={
            fragility.metrics.liqToMcap != null && fragility.metrics.liqToMcap < 0.05
              ? colors.warn
              : undefined
          }
        />
      </View>

      <View style={styles.section}>
        <View style={styles.tabRow}>
          <View style={styles.tabs}>
            {WINDOWS.map((o) => (
              <Pressable
                key={o.key}
                onPress={() => setWin(o.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: win === o.key }}
                style={[styles.tab, win === o.key && styles.tabOn]}
              >
                <Text style={[styles.tabText, win === o.key && styles.tabTextOn]}>
                  {o.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text
            style={[
              styles.delta,
              {
                color:
                  w.priceChangePct == null
                    ? colors.muted
                    : w.priceChangePct >= 0
                      ? colors.up
                      : colors.down,
              },
            ]}
          >
            {pct(w.priceChangePct)}
          </Text>
        </View>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>TRANSAÇÕES</Text>
            <Text style={styles.statValue}>{count(total || null)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>VOLUME</Text>
            <Text style={styles.statValue}>{usd(w.volumeUsd)}</Text>
          </View>
        </View>

        {/* Só transações: a API pública não separa volume por lado. */}
        {buyShare != null ? (
          <View style={styles.pressure}>
            <View style={styles.pressureLabels}>
              <Text style={[styles.pressureText, { color: colors.up }]}>
                {count(w.buys)} compras
              </Text>
              <Text style={[styles.pressureText, { color: colors.down }]}>
                {count(w.sells)} vendas
              </Text>
            </View>
            <View style={styles.bar}>
              <View
                style={{
                  flex: buyShare,
                  backgroundColor: colors.up,
                }}
              />
              <View style={{ flex: 1 - buyShare, backgroundColor: colors.down }} />
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          SINAIS{fragility.flags.length > 0 ? ` · ${fragility.flags.length}` : ""}
        </Text>
        {fragility.flags.length > 0 ? (
          fragility.flags.map((f) => (
            <View key={f.id} style={styles.flagRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: f.severity === "alta" ? colors.down : colors.warn },
                ]}
              />
              <Text style={styles.flagText}>
                <Text style={styles.flagLabel}>{f.label}</Text> — {f.detail}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.note}>
            Nenhum sinal de fragilidade nos limiares atuais: o par tem idade,
            profundidade e fluxo dentro do esperado. Não é aval — é ausência de alerta.
          </Text>
        )}
        <Text style={styles.disclaimer}>{fragility.disclaimer}</Text>
      </View>
    </View>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.cellValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(2),
    padding: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headLeft: { flexDirection: "row", alignItems: "center", gap: spacing(2.5), flex: 1 },
  headText: { flex: 1 },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgElevated },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  symbol: { color: colors.fg, fontSize: 14, fontVariant: ["tabular-nums"] },
  quote: { color: colors.subtle },
  ageRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  age: { color: colors.muted, fontSize: 11 },
  subtitle: { color: colors.subtle, fontSize: 11, marginTop: 1 },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2.5),
  },
  level: { fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", padding: spacing(2) },
  cell: { width: "50%", padding: spacing(1.5) },
  cellLabel: { color: colors.subtle, fontSize: 10, letterSpacing: 0.5 },
  cellValue: {
    color: colors.fg,
    fontSize: 14,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  section: {
    padding: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing(2.5),
  },
  sectionLabel: { color: colors.subtle, fontSize: 10, letterSpacing: 0.5 },
  tabRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tabs: { flexDirection: "row", gap: spacing(1) },
  tab: { paddingHorizontal: spacing(2), paddingVertical: spacing(1), borderRadius: radius.xs },
  tabOn: { backgroundColor: colors.bgElevated },
  tabText: { color: colors.subtle, fontSize: 11 },
  tabTextOn: { color: colors.fg },
  delta: { fontSize: 14, fontVariant: ["tabular-nums"] },
  statRow: { flexDirection: "row" },
  stat: { flex: 1 },
  statLabel: { color: colors.subtle, fontSize: 10, letterSpacing: 0.5 },
  statValue: { color: colors.fg, fontSize: 14, marginTop: 2, fontVariant: ["tabular-nums"] },
  pressure: { gap: spacing(1) },
  pressureLabels: { flexDirection: "row", justifyContent: "space-between" },
  pressureText: { fontSize: 11, fontVariant: ["tabular-nums"] },
  bar: { flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden" },
  flagRow: { flexDirection: "row", gap: spacing(2), alignItems: "flex-start" },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  flagText: { color: colors.muted, fontSize: 11, lineHeight: 17, flex: 1 },
  flagLabel: { color: colors.fg },
  note: { color: colors.subtle, fontSize: 11, lineHeight: 17 },
  disclaimer: {
    color: colors.subtle,
    fontSize: 11,
    lineHeight: 17,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(2.5),
  },
});
