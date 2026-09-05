import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ArrowLeft,
  Eye,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import { Badge } from "../components/Badge";
import { ChartToolbar, type ChartType } from "../components/ChartToolbar";
import { OhlcChart } from "../components/OhlcChart";
import { OnchainCard } from "../components/OnchainCard";
import { PathChart } from "../components/PathChart";
import { RiskCard } from "../components/RiskCard";
import { SampleBanner } from "../components/SampleBanner";
import { ScenarioCard } from "../components/ScenarioCard";
import { TimeframeSwitch } from "../components/TimeframeSwitch";
import { ResultTabs, type ResultTab } from "../components/ResultTabs";
import { SplitBar } from "../components/SplitBar";
import { colors, radius } from "../theme";
import { fonts } from "../fonts";
import {
  barsToHuman,
  formatInt,
  formatPct,
  formatPrice,
  formatWhen,
  timeframeLabel,
} from "../format";
import { sampleTitle } from "../sample-copy";
import { baselineDeltaLabel } from "../baseline-copy";
import { DEFAULT_ALERT_RULES, loadAlertRules } from "../alert-settings";
import { recordRiskEvents } from "../risk-log";
import { useLivePrice } from "../use-live-price";
import type { HorizonOutcome, StoredAnalysis, Timeframe } from "../types";

export function ResultScreen({
  analysis,
  onBack,
  watched = false,
  onToggleWatch,
  onChangeTimeframe,
  reanalyzing = false,
  reanalyzeError = null,
}: {
  analysis: StoredAnalysis;
  onBack: () => void;
  watched?: boolean;
  onToggleWatch?: () => void;
  onChangeTimeframe?: (tf: Timeframe) => void;
  reanalyzing?: boolean;
  reanalyzeError?: string | null;
}) {
  const { snapshot, precedent, vision, onchain } = analysis;
  const [horizonIdx, setHorizonIdx] = useState(
    Math.min(1, Math.max(0, precedent.horizons.length - 1)),
  );
  const [drawdownThresholdPct, setDrawdownThresholdPct] = useState(
    DEFAULT_ALERT_RULES.drawdownThresholdPct,
  );
  const [activeTab, setActiveTab] = useState<ResultTab>("paths");
  const [chartType, setChartType] = useState<ChartType>("candle");
  const [showSma20, setShowSma20] = useState(true);
  const [showSma50, setShowSma50] = useState(true);

  useEffect(() => {
    let alive = true;
    void loadAlertRules().then((rules) => {
      if (alive) setDrawdownThresholdPct(rules.drawdownThresholdPct);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const h10 = precedent.horizons.find((h) => h.bars === 10) ?? precedent.horizons[1];
    void recordRiskEvents(analysis.id, {
      sampleWeak: precedent.sampleNote !== "ok",
      drawdownHigh: h10 != null && Math.abs(h10.medianDrawdownPct) >= drawdownThresholdPct,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.id, drawdownThresholdPct]);

  const horizon = precedent.horizons[horizonIdx] ?? precedent.horizons[0]!;
  const livePrice = useLivePrice(analysis.ticker, !reanalyzing);
  const headerPrice = livePrice ?? snapshot.last.c;
  const up = snapshot.changePct >= 0;
  const fp = precedent.fingerprint;

  const hasVision = vision != null || (analysis.visionError != null && analysis.visionError.length > 0) || analysis.thumbUri != null;

  const availableTabs = useMemo<ResultTab[]>(() => {
    const tabs: ResultTab[] = ["paths", "risk", "onchain", "scenario"];
    if (hasVision) tabs.push("vision");
    return tabs;
  }, [hasVision]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
      {/* ── Header ── */}
      <View style={styles.hero}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={colors.fg} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>
            <Text style={styles.eyebrow} numberOfLines={1}>
              {analysis.source} · {timeframeLabel(analysis.timeframe)} ·{" "}
              {formatInt(analysis.candleCount)} candles
              {reanalyzing ? " · reanalisando…" : ""}
            </Text>
            <Text style={styles.ticker} numberOfLines={1}>
              {analysis.displayTicker}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <View style={styles.priceRow}>
              {livePrice != null ? <View style={styles.liveDot} /> : null}
              <Text style={styles.price}>{formatPrice(headerPrice)}</Text>
            </View>
            <Text style={[styles.change, { color: up ? colors.up : colors.down }]}>
              {formatPct(snapshot.changePct)} vela
            </Text>
          </View>
          {onToggleWatch ? (
            <Pressable
              onPress={onToggleWatch}
              style={[styles.watchBtn, watched && styles.watchBtnOn]}
              disabled={reanalyzing}
              hitSlop={4}
            >
              <Star
                size={14}
                color={watched ? colors.accentFg : colors.fg}
                fill={watched ? colors.accentFg : "transparent"}
              />
            </Pressable>
          ) : null}
        </View>

        {onChangeTimeframe ? (
          <View style={{ gap: 4 }}>
            <TimeframeSwitch
              current={analysis.timeframe}
              disabled={reanalyzing}
              onChange={onChangeTimeframe}
            />
            {reanalyzing ? (
              <Text style={[styles.muted, { fontSize: 11 }]}>Atualizando OHLC…</Text>
            ) : null}
            {reanalyzeError ? (
              <Text style={{ color: colors.down, fontSize: 13 }}>{reanalyzeError}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.chipGrid}>
          {precedent.horizons.map((h, i) => (
            <HorizonChip
              key={h.bars}
              horizon={h}
              active={i === horizonIdx}
              onPress={() => setHorizonIdx(i)}
            />
          ))}
          <Chip
            label="Amostra"
            primary={sampleTitle(precedent.sampleNote)}
            secondary={`n=${formatInt(precedent.matches)}`}
            tone={
              precedent.sampleNote === "ok"
                ? "up"
                : precedent.sampleNote === "small"
                  ? "warn"
                  : "down"
            }
          />
          <Chip label="RSI 14" primary={snapshot.rsi14.toFixed(1).replace(".", ",")} />
          <Chip
            label="vs SMA20"
            primary={formatPct(snapshot.distSma20Pct)}
            tone={snapshot.distSma20Pct >= 0 ? "up" : "down"}
          />
          {(snapshot.near20High || snapshot.near20Low) ? (
            <Chip
              label="Extremo 20"
              primary={snapshot.near20High ? "high20" : "low20"}
              tone="warn"
            />
          ) : null}
          {onchain?.fundingRate != null ? (
            <Chip
              label="Funding"
              primary={`${onchain.fundingRate >= 0 ? "+" : ""}${(onchain.fundingRate * 100).toFixed(3).replace(".", ",")}%`}
              tone={Math.abs(onchain.fundingRate) >= 0.0005 ? "warn" : undefined}
            />
          ) : null}
          {onchain?.liquidityUsd != null ? (
            <Chip
              label="Liq DEX"
              primary={
                onchain.liquidityUsd >= 1e9
                  ? `$${(onchain.liquidityUsd / 1e9).toFixed(1)}B`
                  : onchain.liquidityUsd >= 1e6
                    ? `$${(onchain.liquidityUsd / 1e6).toFixed(1)}M`
                    : `$${(onchain.liquidityUsd / 1e3).toFixed(0)}K`
              }
            />
          ) : null}
        </View>

        {precedent.sampleNote !== "ok" ? (
          <SampleBanner sampleNote={precedent.sampleNote} matches={precedent.matches} compact />
        ) : null}

        <View style={[styles.card, { padding: 14, gap: 10 }]}>
          <ChartToolbar
            chartType={chartType}
            onChartType={setChartType}
            showSma20={showSma20}
            showSma50={showSma50}
            onToggleSma20={() => setShowSma20((v) => !v)}
            onToggleSma50={() => setShowSma50((v) => !v)}
          />
          <OhlcChart
            data={analysis.chart}
            matches={precedent.chartMatches}
            displayTicker={analysis.displayTicker}
            timeframe={analysis.timeframe}
            chartType={chartType}
            showSma20={showSma20}
            showSma50={showSma50}
          />
        </View>
      </View>

      {/* ── Tab bar ── */}
      <View style={styles.tabBarWrap}>
        <ResultTabs active={activeTab} onChange={setActiveTab} tabs={availableTabs} />
      </View>

      {/* ── Tab content ── */}
      <View style={styles.tabContent}>
        {activeTab === "paths" && (
          <PathsTab
            analysis={analysis}
            precedent={precedent}
            snapshot={snapshot}
            horizon={horizon}
            horizonIdx={horizonIdx}
            setHorizonIdx={setHorizonIdx}
            fp={fp}
          />
        )}
        {activeTab === "risk" && (
          <RiskCard snapshot={snapshot} precedent={precedent} horizon={horizon} />
        )}
        {activeTab === "onchain" && (
          <OnchainCard onchain={onchain ?? null} />
        )}
        {activeTab === "scenario" && (
          <ScenarioCard analysis={analysis} />
        )}
        {activeTab === "vision" && (
          <VisionTab analysis={analysis} vision={vision} />
        )}
        <Text style={styles.disclaimer}>
          Frequência, caminho e encenação são contexto — nunca ordem. A decisão é só sua. Use{" "}
          <Text style={{ color: colors.fg }}>Ler o cenário</Text>. OHLC: {analysis.source}.
        </Text>
      </View>
      </ScrollView>
    </View>
  );
}

function PathsTab({
  analysis,
  precedent,
  snapshot,
  horizon,
  horizonIdx,
  setHorizonIdx,
  fp,
}: {
  analysis: StoredAnalysis;
  precedent: StoredAnalysis["precedent"];
  snapshot: StoredAnalysis["snapshot"];
  horizon: HorizonOutcome;
  horizonIdx: number;
  setHorizonIdx: (i: number) => void;
  fp: StoredAnalysis["precedent"]["fingerprint"];
}) {
  return (
    <>
      <View style={[styles.card, { padding: 16, gap: 14 }]}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.eyebrow}>O que o preço fez depois</Text>
            <Text style={styles.body}>{horizon.label}</Text>
          </View>
        </View>

        <View style={styles.horizonTabs}>
          {precedent.horizons.map((h, i) => (
            <Pressable
              key={h.bars}
              onPress={() => setHorizonIdx(i)}
              style={[styles.horizonTab, i === horizonIdx && { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.horizonTabText, i === horizonIdx && { color: colors.fg }]}>
                {h.bars}b
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.horizonCards}>
          {precedent.horizons.map((h, i) => (
            <Pressable
              key={h.bars}
              onPress={() => setHorizonIdx(i)}
              style={[styles.hCard, i === horizonIdx && styles.hCardOn]}
            >
              <Text style={styles.muted}>
                {h.bars}b (≈{barsToHuman(analysis.timeframe, h.bars)}) · n={h.samples}
              </Text>
              <Text style={styles.hSplit}>
                <Text style={{ color: colors.up }}>↑{Math.round(h.upPct)}</Text>
                <Text style={{ color: colors.subtle }}> · </Text>
                <Text style={{ color: colors.muted }}>→{Math.round(h.flatPct)}</Text>
                <Text style={{ color: colors.subtle }}> · </Text>
                <Text style={{ color: colors.down }}>↓{Math.round(h.downPct)}</Text>
              </Text>
              <Text style={styles.mono}>med {formatPct(h.medianPct)}</Text>
              <Text style={[styles.mono, { color: colors.down, fontSize: 11 }]}>
                DD {formatPct(h.medianDrawdownPct)}
              </Text>
              <Text style={[styles.muted, { fontSize: 10, marginTop: 2 }]}>
                {baselineDeltaLabel(h.upPct, h.baseline.upPct)}
              </Text>
            </Pressable>
          ))}
        </View>

        <SplitBar horizon={horizon} />

        <View style={styles.statGrid}>
          <Stat label="mediana" value={formatPct(horizon.medianPct)} />
          <Stat label="média" value={formatPct(horizon.meanPct)} />
          <Stat label="P10" value={formatPct(horizon.p10)} />
          <Stat label="P90" value={formatPct(horizon.p90)} />
        </View>

        <PathChart horizon={horizon} />
      </View>

      <View style={styles.twoCol}>
        <View style={[styles.card, styles.half, { padding: 14, gap: 8 }]}>
          <Text style={styles.eyebrow}>Fingerprint</Text>
          <FpRow label="RSI" value={fp.rsiBucket.replace("-", "–")} />
          <FpRow label="Direção" value={fp.direction === "up" ? "alta" : "baixa"} />
          <FpRow label="vs SMA20" value={sideLabel(fp.vsSma20)} />
          <FpRow label="vs SMA50" value={sideLabel(fp.vsSma50)} />
          <FpRow label="Extremo" value={fp.extreme} />
        </View>
        <View style={[styles.card, styles.half, { padding: 14, gap: 8 }]}>
          <Text style={styles.eyebrow}>Snapshot</Text>
          <FpRow label="RSI 14" value={snapshot.rsi14.toFixed(1).replace(".", ",")} />
          <FpRow label="SMA20" value={formatPrice(snapshot.sma20)} />
          <FpRow label="SMA50" value={formatPrice(snapshot.sma50)} />
          <FpRow
            label="SMA200"
            value={snapshot.sma200 != null ? formatPrice(snapshot.sma200) : "—"}
          />
        </View>
      </View>

      {precedent.recentMatches.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.tapeHead}>
            <Text style={styles.eyebrow}>Matches recentes · tape</Text>
          </View>
          {precedent.recentMatches.map((m, i) => {
            const pos = m.forward >= 0;
            return (
              <View
                key={m.t}
                style={[
                  styles.matchRow,
                  i < precedent.recentMatches.length - 1 && styles.matchBorder,
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
      ) : null}
    </>
  );
}

function VisionTab({
  analysis,
  vision,
}: {
  analysis: StoredAnalysis;
  vision: StoredAnalysis["vision"];
}) {
  return (
    <View style={styles.card}>
      {analysis.thumbUri ? (
        <Image source={{ uri: analysis.thumbUri }} style={styles.thumb} resizeMode="cover" />
      ) : null}
      <View style={{ padding: 16, gap: 10 }}>
        <View style={styles.visionHeader}>
          <Eye size={13} color={colors.muted} />
          <Text style={styles.eyebrow}>Leitura visual</Text>
        </View>
        {vision ? (
          <>
            <Text style={styles.body}>{vision.leitura}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <Badge label={`tendência ${vision.tendencia}`} accent />
              {vision.padrao ? <Badge label={vision.padrao} /> : null}
              <Badge label={`confiança ${vision.confianca}`} />
            </View>
          </>
        ) : analysis.visionError ? (
          <Text style={styles.muted}>{analysis.visionError}</Text>
        ) : (
          <Text style={styles.muted}>Nenhum print nesta análise.</Text>
        )}
      </View>
    </View>
  );
}

function HorizonChip({
  horizon,
  active,
  onPress,
}: {
  horizon: HorizonOutcome;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={styles.chipLabel}>H{horizon.bars}</Text>
      <Text style={styles.chipPrimary}>
        <Text style={{ color: colors.up }}>{Math.round(horizon.upPct)}</Text>
        <Text style={{ color: colors.subtle }}>/</Text>
        <Text style={{ color: colors.muted }}>{Math.round(horizon.flatPct)}</Text>
        <Text style={{ color: colors.subtle }}>/</Text>
        <Text style={{ color: colors.down }}>{Math.round(horizon.downPct)}</Text>
      </Text>
    </Pressable>
  );
}

function Chip({
  label,
  primary,
  secondary,
  tone,
}: {
  label: string;
  primary: string;
  secondary?: string;
  tone?: "up" | "down" | "warn";
}) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text
        style={[
          styles.chipPrimary,
          tone === "up" && { color: colors.up },
          tone === "down" && { color: colors.down },
          tone === "warn" && { color: colors.warn },
        ]}
      >
        {primary}
        {secondary ? <Text style={{ color: colors.muted, fontSize: 11 }}> {secondary}</Text> : null}
      </Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: "47%" }}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.mono}>{value}</Text>
    </View>
  );
}

function FpRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.mono}>{value}</Text>
    </View>
  );
}

function sideLabel(side: "above" | "below" | "near"): string {
  if (side === "above") return "acima";
  if (side === "below") return "abaixo";
  return "junto";
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 96 },
  hero: { padding: 16, paddingBottom: 0, gap: 12 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  backBtn: { marginTop: 2 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.muted,
    textTransform: "uppercase",
  },
  ticker: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.fg,
    marginTop: 2,
  },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.up },
  price: { fontSize: 16, color: colors.fg, fontVariant: ["tabular-nums"] },
  change: { fontSize: 11, fontVariant: ["tabular-nums"], marginTop: 2 },
  watchBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
  },
  watchBtnOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    minWidth: 0,
    flexBasis: "30%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  chipOn: { borderWidth: 1, borderColor: colors.border },
  chipLabel: {
    fontSize: 9,
    letterSpacing: 0.3,
    color: colors.subtle,
    textTransform: "uppercase",
  },
  chipPrimary: {
    marginTop: 2,
    fontSize: 12,
    color: colors.fg,
  },
  tabBarWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  tabContent: { padding: 16, paddingTop: 0, gap: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  body: { fontSize: 13, lineHeight: 19, color: colors.fg, marginTop: 2 },
  muted: { fontSize: 12, color: colors.muted },
  mono: { fontSize: 13, color: colors.fg, fontVariant: ["tabular-nums"] },
  horizonTabs: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: 4,
  },
  horizonTab: {
    flex: 1,
    height: 34,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  horizonTabText: { fontSize: 12, fontWeight: "500", color: colors.muted },
  horizonCards: { flexDirection: "row", gap: 8 },
  hCard: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: 10,
    gap: 4,
  },
  hCardOn: { borderWidth: 1, borderColor: colors.border },
  hSplit: { fontSize: 11, fontVariant: ["tabular-nums"] },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  twoCol: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  tapeHead: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  matchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  matchBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  thumb: { width: "100%", height: 140 },
  visionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  disclaimer: { fontSize: 11, lineHeight: 16, color: colors.subtle },
});
