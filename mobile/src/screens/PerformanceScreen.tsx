import { useMemo } from "react";
import { type DimensionValue, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Hash,
  Minus,
  TrendingUp,
} from "lucide-react-native";
import { Badge } from "../components/Badge";
import { colors, radius } from "../theme";
import { fonts } from "../fonts";
import { formatPct, timeframeLabel } from "../format";
import type { StoredAnalysis, Timeframe } from "../types";

type Stats = {
  total: number;
  topPairs: { pair: string; count: number }[];
  tfDist: { tf: Timeframe; count: number }[];
  dirDist: { up: number; down: number; flat: number };
  sampleDist: { ok: number; small: number; tiny: number };
  avgMatches: number;
  avgMedianPct: number;
  firstAt: number;
  lastAt: number;
};

function compute(items: StoredAnalysis[]): Stats | null {
  if (items.length === 0) return null;

  const pairCounts = new Map<string, number>();
  const tfCounts = new Map<Timeframe, number>();
  const dir = { up: 0, down: 0, flat: 0 };
  const sample = { ok: 0, small: 0, tiny: 0 };
  let totalMatches = 0;
  let totalMedian = 0;
  let medianCount = 0;

  for (const a of items) {
    pairCounts.set(a.displayTicker, (pairCounts.get(a.displayTicker) ?? 0) + 1);
    tfCounts.set(a.timeframe, (tfCounts.get(a.timeframe) ?? 0) + 1);

    const h = a.precedent.horizons;
    const mid = h.find((x) => x.bars === 10) ?? h[Math.min(1, h.length - 1)] ?? h[0];
    if (mid) {
      if (mid.medianPct > 0.15) dir.up++;
      else if (mid.medianPct < -0.15) dir.down++;
      else dir.flat++;
      totalMedian += mid.medianPct;
      medianCount++;
    }

    sample[a.precedent.sampleNote]++;
    totalMatches += a.precedent.matches;
  }

  const topPairs = [...pairCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([pair, count]) => ({ pair, count }));

  const tfDist = (["1m", "5m", "15m", "1h", "4h", "1d"] as Timeframe[])
    .map((tf) => ({ tf, count: tfCounts.get(tf) ?? 0 }))
    .filter((x) => x.count > 0);

  const sorted = items.map((a) => a.createdAt).sort((a, b) => a - b);

  return {
    total: items.length,
    topPairs,
    tfDist,
    dirDist: dir,
    sampleDist: sample,
    avgMatches: Math.round(totalMatches / items.length),
    avgMedianPct: medianCount > 0 ? totalMedian / medianCount : 0,
    firstAt: sorted[0]!,
    lastAt: sorted[sorted.length - 1]!,
  };
}

export function PerformanceScreen({ items }: { items: StoredAnalysis[] }) {
  const stats = useMemo(() => compute(items), [items]);

  if (!stats) {
    return (
      <View style={s.empty}>
        <BarChart3 size={22} color={colors.subtle} />
        <Text style={s.emptyTitle}>Sem dados ainda.</Text>
        <Text style={s.emptyHint}>
          Faça análises pelo app e volte aqui pra ver suas estatísticas.
        </Text>
      </View>
    );
  }

  const dirTotal = stats.dirDist.up + stats.dirDist.down + stats.dirDist.flat;
  const sampleTotal =
    stats.sampleDist.ok + stats.sampleDist.small + stats.sampleDist.tiny;

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.title}>Desempenho</Text>

      {/* Big numbers */}
      <View style={s.row}>
        <StatTile label="Total" value={String(stats.total)} />
        <StatTile label="Méd. precedentes" value={String(stats.avgMatches)} />
        <StatTile
          label="Méd. mediana"
          value={formatPct(stats.avgMedianPct, 2)}
          color={
            stats.avgMedianPct > 0
              ? colors.up
              : stats.avgMedianPct < 0
                ? colors.down
                : colors.muted
          }
        />
      </View>

      {/* Top pairs */}
      <SectionLabel label="PARES MAIS ANALISADOS" />
      <View style={s.card}>
        {stats.topPairs.map((p) => {
          const pct = ((p.count / stats.total) * 100).toFixed(0);
          return (
            <View key={p.pair} style={s.barRow}>
              <Text style={s.barLabel}>{p.pair}</Text>
              <View style={s.barTrack}>
                <View
                  style={[
                    s.barFill,
                    { width: `${pct}%` as DimensionValue },
                  ]}
                />
              </View>
              <Text style={s.barValue}>{p.count}</Text>
            </View>
          );
        })}
      </View>

      {/* Timeframe distribution */}
      <SectionLabel label="DISTRIBUIÇÃO POR TIMEFRAME" />
      <View style={s.card}>
        {stats.tfDist.map((t) => {
          const pct = ((t.count / stats.total) * 100).toFixed(0);
          return (
            <View key={t.tf} style={s.barRow}>
              <Text style={s.barLabel}>{timeframeLabel(t.tf)}</Text>
              <View style={s.barTrack}>
                <View
                  style={[
                    s.barFill,
                    { width: `${pct}%` as DimensionValue, backgroundColor: colors.warn },
                  ]}
                />
              </View>
              <Text style={s.barValue}>{t.count}</Text>
            </View>
          );
        })}
      </View>

      {/* Direction distribution */}
      <SectionLabel label="VIÉS DIRECIONAL" />
      <View style={s.card}>
        <View style={s.distRow}>
          <DistChip
            icon={ArrowUp}
            label="Alta"
            count={stats.dirDist.up}
            total={dirTotal}
            color={colors.up}
          />
          <DistChip
            icon={Minus}
            label="Neutro"
            count={stats.dirDist.flat}
            total={dirTotal}
            color={colors.muted}
          />
          <DistChip
            icon={ArrowDown}
            label="Baixa"
            count={stats.dirDist.down}
            total={dirTotal}
            color={colors.down}
          />
        </View>
        <View style={s.stackBar}>
          {stats.dirDist.up > 0 && (
            <View
              style={[
                s.stackSeg,
                {
                  flex: stats.dirDist.up,
                  backgroundColor: colors.up,
                  borderTopLeftRadius: 4,
                  borderBottomLeftRadius: 4,
                },
              ]}
            />
          )}
          {stats.dirDist.flat > 0 && (
            <View
              style={[
                s.stackSeg,
                { flex: stats.dirDist.flat, backgroundColor: colors.subtle },
              ]}
            />
          )}
          {stats.dirDist.down > 0 && (
            <View
              style={[
                s.stackSeg,
                {
                  flex: stats.dirDist.down,
                  backgroundColor: colors.down,
                  borderTopRightRadius: 4,
                  borderBottomRightRadius: 4,
                },
              ]}
            />
          )}
        </View>
      </View>

      {/* Sample quality */}
      <SectionLabel label="QUALIDADE DA AMOSTRA" />
      <View style={s.card}>
        <View style={s.distRow}>
          <View style={s.distItem}>
            <Badge label="OK" accent />
            <Text style={s.distCount}>{stats.sampleDist.ok}</Text>
            <Text style={s.distPct}>
              {sampleTotal > 0
                ? `${((stats.sampleDist.ok / sampleTotal) * 100).toFixed(0)}%`
                : "—"}
            </Text>
          </View>
          <View style={s.distItem}>
            <Badge label="SMALL" warn />
            <Text style={s.distCount}>{stats.sampleDist.small}</Text>
            <Text style={s.distPct}>
              {sampleTotal > 0
                ? `${((stats.sampleDist.small / sampleTotal) * 100).toFixed(0)}%`
                : "—"}
            </Text>
          </View>
          <View style={s.distItem}>
            <Badge label="TINY" warn />
            <Text style={s.distCount}>{stats.sampleDist.tiny}</Text>
            <Text style={s.distPct}>
              {sampleTotal > 0
                ? `${((stats.sampleDist.tiny / sampleTotal) * 100).toFixed(0)}%`
                : "—"}
            </Text>
          </View>
        </View>
      </View>

      {/* Period */}
      <View style={s.footer}>
        <Text style={s.footerText}>
          Período: {new Date(stats.firstAt).toLocaleDateString("pt-BR")} —{" "}
          {new Date(stats.lastAt).toLocaleDateString("pt-BR")}
        </Text>
      </View>
    </ScrollView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={s.tile}>
      <Text style={[s.tileValue, color ? { color } : undefined]}>{value}</Text>
      <Text style={s.tileLabel}>{label}</Text>
    </View>
  );
}

function DistChip({
  icon: Icon,
  label,
  count,
  total,
  color,
}: {
  icon: typeof ArrowUp;
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  return (
    <View style={s.distItem}>
      <Icon size={14} color={color} />
      <Text style={[s.distLabel, { color }]}>{label}</Text>
      <Text style={s.distCount}>{count}</Text>
      <Text style={s.distPct}>
        {total > 0 ? `${((count / total) * 100).toFixed(0)}%` : "—"}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: "700",
    color: colors.fg,
    marginBottom: 4,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 80,
  },
  emptyTitle: { fontSize: 14, color: colors.muted },
  emptyHint: {
    fontSize: 12,
    color: colors.subtle,
    textAlign: "center",
    maxWidth: 260,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: colors.subtle,
    textTransform: "uppercase",
    marginTop: 8,
  },
  row: { flexDirection: "row", gap: 8 },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  tileValue: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.fg,
    fontVariant: ["tabular-nums"],
  },
  tileLabel: { fontSize: 10, color: colors.muted, textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: {
    width: 72,
    fontSize: 12,
    color: colors.fg,
    fontWeight: "500",
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.bg,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: 8,
    backgroundColor: colors.accent,
    borderRadius: 4,
    minWidth: 4,
  },
  barValue: {
    width: 28,
    fontSize: 11,
    color: colors.muted,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  distRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  distItem: { alignItems: "center", gap: 4 },
  distLabel: { fontSize: 11, fontWeight: "500" },
  distCount: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.fg,
    fontVariant: ["tabular-nums"],
  },
  distPct: { fontSize: 10, color: colors.muted, fontVariant: ["tabular-nums"] },
  stackBar: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 4,
  },
  stackSeg: { height: 8 },
  footer: { alignItems: "center", paddingVertical: 8 },
  footerText: { fontSize: 11, color: colors.subtle },
});
