import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ShieldAlert } from "lucide-react-native";
import { colors, radius } from "../theme";
import { getRiskLog, type RiskLog } from "../risk-log";

/**
 * Prova de valor sem prometer lucro: quantas vezes um aviso de risco real
 * (amostra fraca ou drawdown de caminho) apareceu numa análise que o
 * usuário abriu. Some sozinho enquanto o contador estiver zerado — não
 * inventa prova de valor pra quem ainda não viu nenhum aviso.
 */
export function RiskLogPanel() {
  const [log, setLog] = useState<RiskLog | null>(null);

  useEffect(() => {
    let alive = true;
    void getRiskLog().then((l) => {
      if (alive) setLog(l);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!log) return null;
  const total = log.sampleWeak + log.drawdownHigh;
  if (total === 0) return null;

  const parts: string[] = [];
  if (log.sampleWeak > 0) parts.push(`${log.sampleWeak} de amostra fraca`);
  if (log.drawdownHigh > 0) parts.push(`${log.drawdownHigh} de drawdown de caminho elevado`);

  return (
    <View style={styles.wrap}>
      <View style={styles.eyebrowRow}>
        <ShieldAlert size={12} color={colors.muted} />
        <Text style={styles.eyebrow}>Riscos sinalizados</Text>
      </View>
      <Text style={styles.body}>
        <Text style={styles.count}>{total}</Text> aviso{total === 1 ? "" : "s"} de risco —{" "}
        {parts.join(" e ")}.
      </Text>
      <Text style={styles.note}>
        Não é lucro gerado — é risco que apareceu na tela antes da sua decisão.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 12,
    gap: 4,
  },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: colors.muted,
    textTransform: "uppercase",
  },
  body: { fontSize: 13, lineHeight: 18, color: colors.fg },
  count: { fontWeight: "700", fontVariant: ["tabular-nums"] },
  note: { fontSize: 11, lineHeight: 15, color: colors.subtle },
});
