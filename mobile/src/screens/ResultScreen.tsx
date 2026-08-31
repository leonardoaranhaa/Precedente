import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, Eye, Info, TrendingDown, TrendingUp } from "lucide-react-native";
import { Badge } from "../components/Badge";
import { PathChart } from "../components/PathChart";
import { SplitBar } from "../components/SplitBar";
import { colors, radius } from "../theme";
import { fonts } from "../fonts";
import {
  fingerprintLabel,
  formatInt,
  formatPct,
  formatPrice,
  formatWhen,
  timeframeLabel,
} from "../format";
import type { StoredAnalysis } from "../types";

export function ResultScreen({
  analysis,
  onBack,
}: {
  analysis: StoredAnalysis;
  onBack: () => void;
}) {
  const { snapshot, precedent, vision } = analysis;
  const [horizonIdx, setHorizonIdx] = useState(1);
  const horizon = precedent.horizons[horizonIdx] ?? precedent.horizons[0]!;
  const up = snapshot.changePct >= 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={20} color={colors.fg} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>
            {analysis.source} · {timeframeLabel(analysis.timeframe)}
          </Text>
          <Text style={styles.ticker}>{analysis.displayTicker}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.price}>{formatPrice(snapshot.last.c)}</Text>
          <Text style={[styles.change, { color: up ? colors.up : colors.down }]}>
            {formatPct(snapshot.changePct)}
          </Text>
        </View>
      </View>

      {analysis.thumbUri || vision ? (
        <View style={styles.card}>
          {analysis.thumbUri ? (
            <Image source={{ uri: analysis.thumbUri }} style={styles.thumb} resizeMode="cover" />
          ) : null}
          <View style={{ padding: 16, gap: 10 }}>
            <View style={styles.visionHeader}>
              <Eye size={13} color={colors.muted} />
              <Text style={styles.eyebrow}>Leitura visual</Text>
              <Text style={[styles.eyebrow, { color: colors.subtle }]}>apoio qualitativo</Text>
            </View>
            {vision ? (
              <>
                <Text style={styles.body}>{vision.leitura}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  <Badge label={`tendência ${vision.tendencia}`} accent />
                  {vision.padrao ? <Badge label={vision.padrao} /> : null}
                  <Badge label={`confiança ${vision.confianca}`} />
                </View>
                {vision.suporteResistencia ? (
                  <Text style={styles.muted}>{vision.suporteResistencia}</Text>
                ) : null}
              </>
            ) : analysis.visionError ? (
              <Text style={styles.muted}>{analysis.visionError}</Text>
            ) : (
              <Text style={styles.muted}>Nenhum print nesta análise.</Text>
            )}
          </View>
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        <Text style={styles.eyebrow}>Condição atual · dado real</Text>
        <View style={styles.metricGrid}>
          <Metric label="RSI 14" value={snapshot.rsi14.toFixed(1).replace(".", ",")} />
          <Metric
            label="vs SMA20"
            value={formatPct(snapshot.distSma20Pct)}
            tone={snapshot.distSma20Pct >= 0 ? "up" : "down"}
          />
          <Metric
            label="vs SMA50"
            value={formatPct(snapshot.distSma50Pct)}
            tone={snapshot.distSma50Pct >= 0 ? "up" : "down"}
          />
          <Metric label="SMA200" value={snapshot.sma200 != null ? formatPrice(snapshot.sma200) : "—"} />
        </View>
        <Text style={styles.muted}>
          {fingerprintLabel(precedent.fingerprint)}.
          {snapshot.lastExtrema
            ? ` Último ${snapshot.lastExtrema.type === "top" ? "topo" : "fundo"} há ${snapshot.lastExtrema.barsAgo} barras.`
            : ""}
        </Text>
      </View>

      <View style={[styles.card, { padding: 16, gap: 16 }]}>
        <View>
          <Text style={styles.eyebrow}>Precedente histórico</Text>
          <Text style={styles.bigNumber}>{formatInt(precedent.matches)}</Text>
          <Text style={styles.muted}>
            vezes em {formatInt(analysis.candleCount)} candles desta série.
            {precedent.relaxed.length > 0
              ? ` Filtros relaxados: ${precedent.relaxed.join(", ")}.`
              : ""}
          </Text>
          {precedent.sampleNote !== "ok" ? (
            <View style={styles.warnRow}>
              <Info size={13} color={colors.warn} />
              <Text style={[styles.muted, { color: colors.warn, flex: 1 }]}>
                {precedent.sampleNote === "tiny"
                  ? "Amostra muito pequena — trate como ilustração, não como base."
                  : "Amostra pequena — interprete com cautela."}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.horizonTabs}>
          {precedent.horizons.map((h, i) => (
            <Pressable
              key={h.bars}
              onPress={() => setHorizonIdx(i)}
              style={[styles.horizonTab, i === horizonIdx && { backgroundColor: colors.surface }]}
            >
              <Text
                style={[styles.horizonTabText, i === horizonIdx && { color: colors.fg }]}
              >
                {h.bars} barras
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.body}>O que aconteceu depois · {horizon.label}</Text>
        <SplitBar horizon={horizon} />

        <View style={styles.statRows}>
          <StatRow label="mediana" value={formatPct(horizon.medianPct)} />
          <StatRow label="média" value={formatPct(horizon.meanPct)} />
          <StatRow label="10% pior que (P10)" value={formatPct(horizon.p10)} />
          <StatRow label="10% melhor que (P90)" value={formatPct(horizon.p90)} />
        </View>

        <PathChart horizon={horizon} />

        <View style={styles.divider} />

        <Text style={styles.body}>O caminho até lá</Text>
        <View style={styles.statRows}>
          <StatRow
            label="queda típica"
            value={formatPct(horizon.medianDrawdownPct)}
            tone="down"
          />
          <StatRow
            label="alta típica"
            value={formatPct(horizon.medianRunupPct)}
            tone="up"
          />
          <StatRow
            label="pior queda"
            value={formatPct(horizon.worstDrawdownPct)}
            tone="down"
          />
        </View>
        <Text style={styles.disclaimer}>
          O retorno acima é só o ponto final. Quem opera alavancado é liquidado
          pelo caminho, não pelo fim dele.
        </Text>
      </View>

      {precedent.recentMatches.length > 0 ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.eyebrow}>Ocorrências recentes</Text>
          <View style={styles.card}>
            {precedent.recentMatches.map((m, i) => {
              const pos = m.forward >= 0;
              return (
                <View
                  key={m.t}
                  style={[
                    styles.matchRow,
                    i < precedent.recentMatches.length - 1 && styles.matchRowBorder,
                  ]}
                >
                  <Text style={styles.muted}>{formatWhen(m.t)}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    {pos ? (
                      <TrendingUp size={13} color={colors.up} />
                    ) : (
                      <TrendingDown size={13} color={colors.down} />
                    )}
                    <Text style={{ color: pos ? colors.up : colors.down, fontSize: 13 }}>
                      {formatPct(m.forward)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <Text style={styles.disclaimer}>
        Frequência e contexto, nunca ordem de compra ou venda. O passado não garante o próximo
        movimento. A leitura do print é qualitativa; o que conta para a estatística é o OHLC da{" "}
        {analysis.source}.
      </Text>
    </ScrollView>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          tone === "up" && { color: colors.up },
          tone === "down" && { color: colors.down },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function StatRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.muted}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          tone === "up" && { color: colors.up },
          tone === "down" && { color: colors.down },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, gap: 24 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  backBtn: { marginTop: 2 },
  eyebrow: { fontSize: 11, letterSpacing: 0.5, color: colors.muted, textTransform: "uppercase" },
  ticker: { fontFamily: fonts.display, fontSize: 26, color: colors.fg, marginTop: 2 },
  price: { fontSize: 17, color: colors.fg, fontVariant: ["tabular-nums"] },
  change: { fontSize: 12, fontVariant: ["tabular-nums"], marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden" },
  thumb: { width: "100%", height: 140 },
  visionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  body: { fontSize: 14, lineHeight: 21, color: colors.fg },
  muted: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  metricLabel: { fontSize: 11, color: colors.muted },
  metricValue: { marginTop: 4, fontSize: 15, color: colors.fg, fontVariant: ["tabular-nums"] },
  bigNumber: {
    fontFamily: fonts.display,
    fontSize: 44,
    color: colors.fg,
    marginTop: 6,
    fontVariant: ["tabular-nums"],
  },
  divider: { height: 1, backgroundColor: colors.border },
  warnRow: { flexDirection: "row", gap: 6, marginTop: 8, alignItems: "flex-start" },
  horizonTabs: { flexDirection: "row", gap: 4, backgroundColor: colors.bg, borderRadius: radius.sm, padding: 4 },
  horizonTab: { flex: 1, height: 36, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  horizonTabText: { fontSize: 12, fontWeight: "500", color: colors.muted },
  statRows: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statRow: { width: "47%", flexDirection: "row", justifyContent: "space-between" },
  statValue: { fontSize: 13, color: colors.fg, fontVariant: ["tabular-nums"] },
  matchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  matchRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  disclaimer: { fontSize: 11, lineHeight: 17, color: colors.subtle },
});
