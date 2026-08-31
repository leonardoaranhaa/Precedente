import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ShieldAlert } from "lucide-react-native";
import { Badge } from "./Badge";
import { colors, radius } from "../theme";
import { formatPct } from "../format";
import type { HorizonOutcome, PrecedentResult, Snapshot } from "../types";

const LEV_OPTIONS = [1, 2, 3, 5] as const;

type Props = {
  snapshot: Snapshot;
  precedent: PrecedentResult;
  horizon: HorizonOutcome;
};

export function RiskCard({ snapshot, precedent, horizon }: Props) {
  const [lev, setLev] = useState<(typeof LEV_OPTIONS)[number]>(1);

  const checklist = useMemo(
    () => [
      {
        id: "sample",
        risk: precedent.sampleNote !== "ok",
        label:
          precedent.sampleNote === "tiny"
            ? "Amostra muito pequena (tiny)"
            : precedent.sampleNote === "small"
              ? "Amostra pequena (< 20 matches)"
              : "Amostra adequada",
      },
      {
        id: "relaxed",
        risk: precedent.relaxed.length > 0,
        label:
          precedent.relaxed.length > 0
            ? `Match relaxado: ${precedent.relaxed.join(", ")}`
            : "Match com critérios completos",
      },
      {
        id: "dd",
        risk: Math.abs(horizon.medianDrawdownPct) > 3,
        label: `DD mediano do caminho ${formatPct(horizon.medianDrawdownPct)}`,
      },
      {
        id: "high20",
        risk: snapshot.near20High,
        label: snapshot.near20High ? "Colado na máxima de 20 barras" : "Longe da máxima 20",
      },
      {
        id: "low20",
        risk: snapshot.near20Low,
        label: snapshot.near20Low ? "Colado na mínima de 20 barras" : "Longe da mínima 20",
      },
    ],
    [
      horizon.medianDrawdownPct,
      precedent.relaxed,
      precedent.sampleNote,
      snapshot.near20High,
      snapshot.near20Low,
    ],
  );

  const riskCount = checklist.filter((c) => c.risk).length;
  const worstAbs = Math.abs(horizon.worstDrawdownPct);
  const stressMove = lev <= 1 ? worstAbs : worstAbs / lev;

  const reading = buildReading({
    sampleNote: precedent.sampleNote,
    relaxed: precedent.relaxed.length > 0,
    medianDd: horizon.medianDrawdownPct,
    worstDd: horizon.worstDrawdownPct,
    riskCount,
  });

  const sampleBar =
    precedent.sampleNote === "ok"
      ? Math.min(100, 40 + precedent.matches)
      : precedent.sampleNote === "small"
        ? 35
        : 15;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <ShieldAlert size={16} color={colors.warn} />
        <Text style={styles.eyebrow}>Prevenção de perdas</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.muted}>Qualidade da amostra</Text>
        <View style={styles.sampleRow}>
          <Badge
            label={precedent.sampleNote.toUpperCase()}
            accent={precedent.sampleNote === "ok"}
            warn={precedent.sampleNote !== "ok"}
          />
          <Text style={styles.mono}>{precedent.matches} matches</Text>
        </View>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${sampleBar}%`,
                backgroundColor:
                  precedent.sampleNote === "ok"
                    ? colors.up
                    : precedent.sampleNote === "small"
                      ? colors.warn
                      : colors.down,
              },
            ]}
          />
        </View>
        {precedent.relaxed.length > 0 ? (
          <Text style={[styles.small, { color: colors.warn }]}>
            Critérios relaxados: {precedent.relaxed.join(", ")}.
          </Text>
        ) : (
          <Text style={styles.small}>Match com fingerprint completo.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.muted}>Risco do caminho · {horizon.bars} barras</Text>
        <Row label="Drawdown mediano" value={formatPct(horizon.medianDrawdownPct)} tone="down" />
        <Row label="Pior drawdown" value={formatPct(horizon.worstDrawdownPct)} tone="down" />
        <Row label="Runup mediano" value={formatPct(horizon.medianRunupPct)} tone="up" />
        <Text style={styles.small}>
          Retorno final ≠ sobrevivência no caminho. Quem se expõe agressivo é pressionado pelo
          drawdown do trajeto.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.muted}>Simulação educativa</Text>
        <View style={styles.levRow}>
          {LEV_OPTIONS.map((n) => (
            <Pressable
              key={n}
              onPress={() => setLev(n)}
              style={[styles.levBtn, lev === n && { backgroundColor: colors.bgElevated }]}
            >
              <Text style={[styles.levText, lev === n && { color: colors.fg }]}>{n}x</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.small}>
          Pior caminho ~{" "}
          <Text style={{ color: colors.down }}>{formatPct(-worstAbs)}</Text>
          {lev > 1 ? (
            <>
              {" "}
              (~<Text style={{ color: colors.warn }}>{formatPct(-stressMove)}</Text> estressa {lev}x).
            </>
          ) : (
            "."
          )}
        </Text>
        <Text style={[styles.small, { color: colors.subtle }]}>
          Não é ordem de corretora. Só ilustra fragilidade do caminho.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.muted}>Checklist</Text>
        {checklist.map((item) => (
          <View key={item.id} style={styles.checkRow}>
            <View
              style={[
                styles.checkDot,
                { backgroundColor: item.risk ? "rgba(196,165,116,0.25)" : "rgba(125,155,122,0.2)" },
              ]}
            >
              <Text style={{ fontSize: 10, color: item.risk ? colors.warn : colors.up }}>
                {item.risk ? "!" : "✓"}
              </Text>
            </View>
            <Text style={[styles.checkLabel, !item.risk && { color: colors.muted }]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.section, styles.borderTop]}>
        <Text style={styles.muted}>Leitura objetiva</Text>
        <Text style={styles.body}>{reading}</Text>
        <Text style={styles.never}>Nunca: compre · venda · entre · long · short</Text>
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.muted}>{label}</Text>
      <Text
        style={[
          styles.mono,
          tone === "up" && { color: colors.up },
          tone === "down" && { color: colors.down },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function buildReading(input: {
  sampleNote: "ok" | "small" | "tiny";
  relaxed: boolean;
  medianDd: number;
  worstDd: number;
  riskCount: number;
}): string {
  const parts: string[] = [];
  if (input.sampleNote === "tiny") {
    parts.push("Amostra insuficiente para confiar na distribuição do caminho.");
  } else if (input.sampleNote === "small") {
    parts.push("Amostra limitada — interprete os horizontes com cautela.");
  } else {
    parts.push("Amostra razoável para leitura descritiva dos precedentes.");
  }
  if (input.relaxed) parts.push("O match só fechou com critérios relaxados.");
  if (Math.abs(input.medianDd) > 3) {
    parts.push(
      `Caminho histórico com drawdown mediano de ${formatPct(input.medianDd)} antes do fim do horizonte.`,
    );
  }
  if (Math.abs(input.worstDd) > 8) {
    parts.push(`Pior trajetória registrada chegou a ${formatPct(input.worstDd)}.`);
  }
  if (input.riskCount >= 3) parts.push("Vários alertas de fragilidade ativos ao mesmo tempo.");
  parts.push("Isto descreve o passado parecido — não ordena exposição.");
  return parts.join(" ");
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 18,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.muted,
    textTransform: "uppercase",
  },
  section: { gap: 8 },
  muted: { fontSize: 12, color: colors.muted },
  sampleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mono: { fontSize: 13, color: colors.fg, fontVariant: ["tabular-nums"] },
  barTrack: {
    height: 6,
    borderRadius: 99,
    backgroundColor: colors.bg,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 99 },
  small: { fontSize: 12, lineHeight: 17, color: colors.subtle },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  levRow: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: 4,
  },
  levBtn: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  levText: { fontSize: 12, fontWeight: "500", color: colors.muted },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  checkDot: {
    width: 16,
    height: 16,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkLabel: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.fg },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  body: { fontSize: 14, lineHeight: 20, color: colors.fg },
  never: {
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.subtle,
    textTransform: "uppercase",
    marginTop: 4,
  },
});
