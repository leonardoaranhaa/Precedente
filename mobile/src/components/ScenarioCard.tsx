import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Theater } from "lucide-react-native";
import {
  runScenario,
  SCENARIO_KEYS,
  type ScenarioKey,
} from "../scenario";
import { formatPct, timeframeLabel } from "../format";
import { loadHistory } from "../history";
import { colors, radius } from "../theme";
import type { StoredAnalysis } from "../types";

function formatMoney(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function analysisKey(a: StoredAnalysis): string {
  return `${a.ticker}:${a.timeframe}`;
}

export function ScenarioCard({ analysis }: { analysis: StoredAnalysis }) {
  const [catalog, setCatalog] = useState<StoredAnalysis[]>([analysis]);
  const [focusId, setFocusId] = useState(analysisKey(analysis));

  useEffect(() => {
    void loadHistory().then((hist) => {
      const map = new Map<string, StoredAnalysis>();
      map.set(analysisKey(analysis), analysis);
      for (const h of hist) {
        const k = analysisKey(h);
        if (!map.has(k)) map.set(k, h);
      }
      setCatalog([...map.values()]);
      setFocusId(analysisKey(analysis));
    });
  }, [analysis.id, analysis.ticker, analysis.timeframe]);

  const focus = catalog.find((a) => analysisKey(a) === focusId) ?? analysis;

  const defaultBars =
    focus.precedent.horizons.find((h) => h.bars === 10)?.bars ??
    focus.precedent.horizons[0]?.bars ??
    10;

  const [capitalText, setCapitalText] = useState("1000");
  const [leverage, setLeverage] = useState(1);
  const [bars, setBars] = useState(defaultBars);
  const [key, setKey] = useState<ScenarioKey>("typical_path");

  useEffect(() => {
    const next =
      focus.precedent.horizons.find((h) => h.bars === 10)?.bars ??
      focus.precedent.horizons[0]?.bars ??
      10;
    setBars(next);
  }, [focus.id]);

  const capital = Number(String(capitalText).replace(",", "."));
  const result = useMemo(
    () =>
      runScenario(focus, {
        capital: Number.isFinite(capital) ? capital : 0,
        leverage,
        horizonBars: bars,
        key,
      }),
    [focus, capital, leverage, bars, key],
  );

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Theater size={14} color={colors.muted} />
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Encenar cenário</Text>
          <Text style={styles.sub}>
            Do ativo em foco (ou outro do histórico). Capital é só unidade de conta — não diz o que
            fazer.
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Ativo e momento</Text>
        <View style={styles.rowWrap}>
          {catalog.slice(0, 10).map((a) => {
            const id = analysisKey(a);
            const active = id === focusId;
            return (
              <Pressable
                key={id}
                onPress={() => setFocusId(id)}
                style={[styles.keyChip, active && styles.chipOn]}
              >
                <Text style={[styles.chipText, active && { color: colors.accentFg }]}>
                  {(a.displayTicker.split("/")[0] ?? a.displayTicker)} · {a.timeframe}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.muted}>
          Em foco: {focus.displayTicker} · {timeframeLabel(focus.timeframe)} · n=
          {focus.precedent.matches}
        </Text>

        <Text style={styles.label}>Capital (unidade de conta)</Text>
        <TextInput
          value={capitalText}
          onChangeText={setCapitalText}
          keyboardType="decimal-pad"
          style={styles.input}
          placeholderTextColor={colors.subtle}
        />

        <Text style={styles.label}>Mult. educativo</Text>
        <View style={styles.row}>
          {[1, 2, 3, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => setLeverage(n)}
              style={[styles.chip, leverage === n && styles.chipOn]}
            >
              <Text style={[styles.chipText, leverage === n && { color: colors.accentFg }]}>
                {n}×
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Horizonte</Text>
        <View style={styles.row}>
          {focus.precedent.horizons.map((h) => (
            <Pressable
              key={h.bars}
              onPress={() => setBars(h.bars)}
              style={[styles.chip, bars === h.bars && styles.chipOn]}
            >
              <Text style={[styles.chipText, bars === h.bars && { color: colors.accentFg }]}>
                {h.bars}b
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Chave</Text>
        <View style={styles.rowWrap}>
          {SCENARIO_KEYS.map((k) => (
            <Pressable
              key={k.id}
              onPress={() => setKey(k.id)}
              style={[styles.keyChip, key === k.id && styles.chipOn]}
            >
              <Text style={[styles.chipText, key === k.id && { color: colors.accentFg }]}>
                {k.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {result ? (
          <View style={styles.result}>
            <View style={styles.resultTop}>
              <Text style={styles.muted}>
                {result.displayTicker} · {result.timeframeLabel} · {result.keyLabel}
              </Text>
              <Text
                style={[
                  styles.pnl,
                  result.pnl > 0 && { color: colors.up },
                  result.pnl < 0 && { color: colors.down },
                ]}
              >
                {formatMoney(result.pnl)}
              </Text>
            </View>
            <Text style={styles.mono}>
              {formatPct(result.movePct)} · notional{" "}
              {formatMoney(result.notional).replace(/^[+−]/, "")}
            </Text>
            <Text style={styles.hint}>{result.timeNote}</Text>
            {result.sampleWarning ? (
              <Text style={styles.warn}>{result.sampleWarning}</Text>
            ) : null}
            {result.lines.map((line, i) => (
              <Text key={i} style={styles.line}>
                {line}
              </Text>
            ))}
            <Text style={styles.disclaimer}>{result.disclaimer}</Text>
          </View>
        ) : (
          <Text style={styles.muted}>Informe um capital maior que zero.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  head: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.muted,
    textTransform: "uppercase",
  },
  sub: { fontSize: 11, lineHeight: 15, color: colors.subtle, marginTop: 2 },
  body: { padding: 14, gap: 8 },
  label: {
    fontSize: 10,
    letterSpacing: 0.3,
    color: colors.subtle,
    textTransform: "uppercase",
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.fg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  row: { flexDirection: "row", gap: 6 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flex: 1,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  keyChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: colors.accent },
  chipText: { fontSize: 12, fontWeight: "500", color: colors.muted },
  result: {
    marginTop: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    gap: 8,
  },
  resultTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
  },
  muted: { fontSize: 12, color: colors.muted, flexShrink: 1 },
  pnl: { fontSize: 18, fontVariant: ["tabular-nums"], color: colors.fg },
  mono: { fontSize: 11, color: colors.muted, fontVariant: ["tabular-nums"] },
  hint: { fontSize: 11, lineHeight: 15, color: colors.subtle },
  warn: { fontSize: 11, lineHeight: 15, color: colors.warn },
  line: { fontSize: 13, lineHeight: 19, color: colors.fg },
  disclaimer: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    fontSize: 11,
    lineHeight: 15,
    color: colors.subtle,
  },
});
