import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LogOut, Sparkles, User } from "lucide-react-native";
import type { AuthUser } from "../auth";
import { getBillingStatus } from "../billing";
import { colors, radius } from "../theme";
import { Button } from "../components/Button";

type Mode = "signin" | "signup";

export function AccountScreen({
  user,
  busy,
  error,
  onSignIn,
  onSignUp,
  onSignOut,
  onCheckout,
  onManage,
}: {
  user: AuthUser | null;
  busy: boolean;
  error: string | null;
  onSignIn: (email: string, password: string) => void;
  onSignUp: (name: string, email: string, password: string) => void;
  onSignOut: () => void;
  onCheckout: () => Promise<{ url: string } | { error: string }>;
  onManage: () => Promise<{ url: string } | { error: string }>;
}) {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setStatusLoading(true);
    getBillingStatus()
      .then((s) => setActive(s.active))
      .finally(() => setStatusLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só precisa recarregar quando o id muda
  }, [user?.id]);

  async function handleBilling() {
    setBillingError(null);
    setBillingBusy(true);
    const result = active ? await onManage() : await onCheckout();
    setBillingBusy(false);
    if ("error" in result) {
      setBillingError(result.error);
      return;
    }
    await Linking.openURL(result.url);
  }

  if (!user) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{mode === "signup" ? "Criar conta" : "Entrar"}</Text>
        <Text style={styles.subtitle}>
          Conta é opcional — só pra sincronizar watch e histórico entre aparelhos e assinar o
          plano premium. A análise continua funcionando sem login.
        </Text>

        <View style={{ gap: 10 }}>
          {mode === "signup" ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nome"
              placeholderTextColor={colors.subtle}
              autoCapitalize="words"
              style={styles.input}
            />
          ) : null}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.subtle}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Senha"
            placeholderTextColor={colors.subtle}
            secureTextEntry
            style={styles.input}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            title={mode === "signup" ? "Criar conta" : "Entrar"}
            loading={busy}
            onPress={() =>
              mode === "signup" ? onSignUp(name, email, password) : onSignIn(email, password)
            }
          />
        </View>

        <Pressable onPress={() => setMode((m) => (m === "signup" ? "signin" : "signup"))}>
          <Text style={styles.switchText}>
            {mode === "signup" ? "Já tem conta? Entrar" : "Não tem conta? Criar uma"}
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <User size={22} color={colors.warn} />
        <Text style={styles.title}>Conta</Text>
      </View>
      <Text style={styles.email}>{user.email}</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.planBadge}>
            <Sparkles size={14} color={active ? colors.accent : colors.subtle} />
            <Text style={[styles.planText, active && { color: colors.accent }]}>
              {statusLoading ? "Carregando…" : active ? "Premium ativo" : "Plano gratuito"}
            </Text>
          </View>
          <Pressable
            style={styles.billingBtn}
            disabled={billingBusy || statusLoading}
            onPress={() => void handleBilling()}
          >
            {billingBusy ? (
              <ActivityIndicator size="small" color={colors.accentFg} />
            ) : (
              <Text style={styles.billingBtnText}>{active ? "Gerenciar" : "Virar Premium"}</Text>
            )}
          </Pressable>
        </View>
        {billingError ? <Text style={styles.errorText}>{billingError}</Text> : null}
        {!active ? (
          <Text style={styles.hint}>
            Assinar não muda o que o app mostra: sempre estatística do passado, nunca
            recomendação. Abre no navegador do aparelho.
          </Text>
        ) : null}
      </View>

      <Pressable style={styles.signOutBtn} onPress={onSignOut}>
        <LogOut size={16} color={colors.muted} />
        <Text style={styles.signOutText}>Sair</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 20, fontWeight: "700", color: colors.fg },
  subtitle: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  email: { fontSize: 13, color: colors.muted },
  input: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    color: colors.fg,
    fontSize: 14,
  },
  errorText: { fontSize: 12, color: colors.down },
  switchText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  card: {
    gap: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  planBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  planText: { fontSize: 13, fontWeight: "600", color: colors.subtle },
  billingBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  billingBtnText: { fontSize: 12, fontWeight: "600", color: colors.accentFg },
  hint: { fontSize: 11, color: colors.subtle, lineHeight: 16 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  signOutText: { fontSize: 13, fontWeight: "500", color: colors.muted },
});
