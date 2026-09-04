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
import { ChevronDown, ChevronRight, LogOut, Sparkles, User } from "lucide-react-native";
import { changePassword, type AuthUser } from "../auth";
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
  onUpdateName,
}: {
  user: AuthUser | null;
  busy: boolean;
  error: string | null;
  onSignIn: (email: string, password: string) => void;
  onSignUp: (name: string, email: string, password: string) => void;
  onSignOut: () => void;
  onCheckout: () => Promise<{ url: string } | { error: string }>;
  onManage: () => Promise<{ url: string } | { error: string }>;
  onUpdateName: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
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

      <View style={styles.card}>
        <ExpandableRow label="Nome" summary={user.name}>
          <NameForm user={user} onUpdateName={onUpdateName} />
        </ExpandableRow>
        <View style={styles.rowDivider} />
        <ExpandableRow label="Senha" summary="••••••••">
          <PasswordForm />
        </ExpandableRow>
        <View style={styles.rowDivider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Notificações</Text>
          <Text style={styles.rowValue}>Por par, na Watch</Text>
        </View>
      </View>

      <Pressable style={styles.signOutBtn} onPress={onSignOut}>
        <LogOut size={16} color={colors.muted} />
        <Text style={styles.signOutText}>Sair</Text>
      </Pressable>
    </ScrollView>
  );
}

/**
 * Linha de configuração que expande no toque, em vez de formulário sempre
 * aberto — no celular a tela é curta, e um card com tudo visível de uma vez
 * fica pesado. Só "Nome" e "Senha" abrem; o resto do app usa o mesmo padrão.
 */
function ExpandableRow({
  label,
  summary,
  children,
}: {
  label: string;
  summary: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable style={styles.row} onPress={() => setOpen((o) => !o)}>
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {!open ? <Text style={styles.rowValue}>{summary}</Text> : null}
          {open ? (
            <ChevronDown size={16} color={colors.subtle} />
          ) : (
            <ChevronRight size={16} color={colors.subtle} />
          )}
        </View>
      </Pressable>
      {open ? <View style={{ marginTop: 10, gap: 8 }}>{children}</View> : null}
    </View>
  );
}

function NameForm({
  user,
  onUpdateName,
}: {
  user: AuthUser;
  onUpdateName: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    if (busy || !name.trim()) return;
    setBusy(true);
    setMsg(null);
    const result = await onUpdateName(name.trim());
    setBusy(false);
    setMsg(result.ok ? "Nome atualizado." : result.error);
  }

  return (
    <>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nome"
          placeholderTextColor={colors.subtle}
          style={[styles.input, { flex: 1, height: 40 }]}
        />
        <Pressable style={[styles.billingBtn, { height: 40 }]} disabled={busy} onPress={() => void save()}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.accentFg} />
          ) : (
            <Text style={styles.billingBtnText}>Salvar</Text>
          )}
        </Pressable>
      </View>
      {msg ? <Text style={styles.hint}>{msg}</Text> : null}
    </>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function save() {
    if (busy || !currentPassword || newPassword.length < 8) return;
    setBusy(true);
    setMsg(null);
    const result = await changePassword(currentPassword, newPassword);
    setBusy(false);
    if (result.ok) {
      setMsg({ text: "Senha alterada.", ok: true });
      setCurrentPassword("");
      setNewPassword("");
    } else {
      setMsg({ text: result.error, ok: false });
    }
  }

  return (
    <>
      <TextInput
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder="Senha atual"
        placeholderTextColor={colors.subtle}
        secureTextEntry
        style={[styles.input, { height: 40 }]}
      />
      <TextInput
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Nova senha (mín. 8 caracteres)"
        placeholderTextColor={colors.subtle}
        secureTextEntry
        style={[styles.input, { height: 40 }]}
      />
      <Pressable
        style={[styles.billingBtn, { alignSelf: "flex-start" }]}
        disabled={busy}
        onPress={() => void save()}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.accentFg} />
        ) : (
          <Text style={styles.billingBtnText}>Atualizar senha</Text>
        )}
      </Pressable>
      {msg ? <Text style={[styles.hint, msg.ok && { color: colors.up }]}>{msg.text}</Text> : null}
    </>
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
  rowLabel: { fontSize: 13, fontWeight: "500", color: colors.fg },
  rowValue: { fontSize: 12, color: colors.subtle },
  rowDivider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
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
