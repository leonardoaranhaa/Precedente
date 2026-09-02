import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Bell, ShieldAlert } from "lucide-react-native";
import type { AlertRules } from "../alert-settings";
import { colors, radius } from "../theme";

const THRESHOLDS = [3, 5, 8, 12] as const;

export function AlertsScreen({
  rules,
  pushToken,
  watchCount,
  syncing,
  statusMessage,
  onChange,
  onRequestPermission,
  onScanNow,
}: {
  rules: AlertRules;
  pushToken: string | null;
  watchCount: number;
  syncing: boolean;
  statusMessage: string | null;
  onChange: (next: AlertRules) => void;
  onRequestPermission: () => void;
  onScanNow: () => void;
}) {
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  function toggle<K extends keyof AlertRules>(key: K, value: AlertRules[K]) {
    onChange({ ...rules, [key]: value });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <Bell size={22} color={colors.warn} />
        <Text style={styles.title}>Alertas</Text>
      </View>
      <Text style={styles.subtitle}>
        Notificações de prevenção para pares na Watch. Nunca ordem de compra ou venda — só
        contexto de amostra, caminho e extremos.
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Ativar push</Text>
            <Text style={styles.rowHint}>
              {pushToken
                ? "Token Expo registrado neste aparelho."
                : "Precisa de permissão e aparelho físico (Expo Go ou build)."}
            </Text>
          </View>
          <Switch
            value={rules.enabled}
            onValueChange={(v) => {
              if (v && !pushToken) {
                onRequestPermission();
              }
              toggle("enabled", v);
            }}
            trackColor={{ false: colors.border, true: colors.warn }}
            thumbColor={colors.fg}
          />
        </View>

        {!pushToken ? (
          <Pressable style={styles.secondaryBtn} onPress={onRequestPermission}>
            <Text style={styles.secondaryBtnText}>Ativar notificações</Text>
          </Pressable>
        ) : null}

        <Text style={styles.meta}>
          Watch sincronizada: {watchCount} par(es)
          {syncing ? " · sincronizando…" : ""}
        </Text>
      </View>

      <View style={[styles.card, !rules.enabled && { opacity: 0.45 }]}>
        <Text style={styles.section}>Regras</Text>

        <RuleRow
          title="Amostra fraca"
          hint="Avisa quando o precedente fica small ou tiny."
          value={rules.sampleWeak}
          disabled={!rules.enabled}
          onChange={(v) => toggle("sampleWeak", v)}
        />
        <RuleRow
          title="Drawdown do caminho"
          hint={`|DD mediano H10| ≥ ${rules.drawdownThresholdPct}%`}
          value={rules.drawdownPath}
          disabled={!rules.enabled}
          onChange={(v) => toggle("drawdownPath", v)}
        />

        <Text style={[styles.rowHint, { marginTop: 4 }]}>Limiar de drawdown</Text>
        <View style={styles.chipRow}>
          {THRESHOLDS.map((n) => (
            <Pressable
              key={n}
              disabled={!rules.enabled}
              onPress={() => toggle("drawdownThresholdPct", n)}
              style={[
                styles.chip,
                rules.drawdownThresholdPct === n && styles.chipOn,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  rules.drawdownThresholdPct === n && { color: colors.fg },
                ]}
              >
                {n}%
              </Text>
            </Pressable>
          ))}
        </View>

        <RuleRow
          title="Extremo 20 barras"
          hint="Preço colado na máxima ou mínima recente."
          value={rules.extreme20}
          disabled={!rules.enabled}
          onChange={(v) => toggle("extreme20", v)}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.titleRow}>
          <ShieldAlert size={16} color={colors.muted} />
          <Text style={styles.section}>Verificação manual</Text>
        </View>
        <Text style={styles.rowHint}>
          Sua Watch é verificada automaticamente a cada 30 minutos, e você recebe um push se
          alguma regra disparar (no máximo 1 aviso a cada 6h por tipo). Toque abaixo pra verificar
          agora, sem esperar.
        </Text>
        <Pressable
          style={[styles.primaryBtn, (!rules.enabled || syncing) && { opacity: 0.5 }]}
          disabled={!rules.enabled || syncing || watchCount === 0}
          onPress={() => {
            setLocalMsg("Verificando…");
            onScanNow();
          }}
        >
          {syncing ? (
            <ActivityIndicator color={colors.accentFg} />
          ) : (
            <Text style={styles.primaryBtnText}>Verificar agora</Text>
          )}
        </Pressable>
      </View>

      {(statusMessage || localMsg) && (
        <Text style={styles.status}>{statusMessage ?? localMsg}</Text>
      )}

      <Text style={styles.disclaimer}>
        Alertas descrevem o passado parecido e o risco do caminho. Não são recomendações de
        exposição.
      </Text>
    </ScrollView>
  );
}

function RuleRow({
  title,
  hint,
  value,
  disabled,
  onChange,
}: {
  title: string;
  hint: string;
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.warn }}
        thumbColor={colors.fg}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, gap: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 28, color: colors.fg, fontWeight: "500" },
  subtitle: { fontSize: 13, lineHeight: 19, color: colors.muted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 14,
  },
  section: {
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.muted,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowTitle: { fontSize: 14, color: colors.fg, fontWeight: "500" },
  rowHint: { fontSize: 12, color: colors.subtle, marginTop: 2, lineHeight: 16 },
  meta: { fontSize: 11, color: colors.subtle },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
  },
  chipOn: { borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: 13, color: colors.muted, fontVariant: ["tabular-nums"] },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: colors.accentFg, fontWeight: "600", fontSize: 14 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryBtnText: { color: colors.fg, fontSize: 13 },
  status: { fontSize: 12, color: colors.warn },
  disclaimer: { fontSize: 11, lineHeight: 16, color: colors.subtle },
});
