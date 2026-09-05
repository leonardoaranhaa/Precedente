import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  LogOut,
  Sparkles,
  User,
} from "lucide-react-native";
import { changePassword, type AuthUser } from "../auth";
import { getBillingStatus } from "../billing";
import { colors, radius } from "../theme";
import { fonts } from "../fonts";
import { Button } from "../components/Button";
import { formatWhen, timeframeLabel } from "../format";
import type { StoredAnalysis } from "../types";

export function MenuScreen({
  user,
  busy,
  error,
  history,
  onSignIn,
  onSignUp,
  onSignOut,
  onCheckout,
  onManage,
  onUpdateName,
  onOpenHistory,
}: {
  user: AuthUser | null;
  busy: boolean;
  error: string | null;
  history: StoredAnalysis[];
  onSignIn: (email: string, password: string) => void;
  onSignUp: (name: string, email: string, password: string) => void;
  onSignOut: () => void;
  onCheckout: () => Promise<{ url: string } | { error: string }>;
  onManage: () => Promise<{ url: string } | { error: string }>;
  onUpdateName: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onOpenHistory: (item: StoredAnalysis) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.screenTitle}>Menu</Text>

      <SectionLabel label="CONTA" />
      <AccountSection
        user={user}
        busy={busy}
        error={error}
        onSignIn={onSignIn}
        onSignUp={onSignUp}
        onSignOut={onSignOut}
        onCheckout={onCheckout}
        onManage={onManage}
        onUpdateName={onUpdateName}
      />

      <SectionLabel label="HISTÓRICO" />
      <HistorySection items={history} onOpen={onOpenHistory} />
    </ScrollView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function AccountSection({
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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
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
      <View style={styles.card}>
        <Pressable style={styles.menuRow} onPress={() => {}}>
          <User size={18} color={colors.muted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.menuRowLabel}>Anônimo</Text>
            <Text style={styles.menuRowHint}>Entre pra sincronizar entre aparelhos</Text>
          </View>
        </Pressable>
        <View style={styles.rowDivider} />
        <View style={{ gap: 10, padding: 4 }}>
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
          <Pressable onPress={() => setMode((m) => (m === "signup" ? "signin" : "signup"))}>
            <Text style={styles.switchText}>
              {mode === "signup" ? "Já tem conta? Entrar" : "Não tem conta? Criar uma"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.card}>
        <View style={styles.menuRow}>
          <User size={18} color={colors.warn} />
          <View style={{ flex: 1 }}>
            <Text style={styles.menuRowLabel}>{user.name}</Text>
            <Text style={styles.menuRowHint}>{user.email}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.menuRow}>
          <Sparkles size={18} color={active ? colors.accent : colors.subtle} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuRowLabel, active && { color: colors.accent }]}>
              {statusLoading ? "Carregando…" : active ? "Premium ativo" : "Plano gratuito"}
            </Text>
          </View>
          <Pressable
            style={styles.actionBtn}
            disabled={billingBusy || statusLoading}
            onPress={() => void handleBilling()}
          >
            {billingBusy ? (
              <ActivityIndicator size="small" color={colors.accentFg} />
            ) : (
              <Text style={styles.actionBtnText}>{active ? "Gerenciar" : "Virar Premium"}</Text>
            )}
          </Pressable>
        </View>
        {billingError ? <Text style={styles.errorText}>{billingError}</Text> : null}
      </View>

      <View style={styles.card}>
        <ExpandableRow label="Nome" summary={user.name}>
          <NameForm user={user} onUpdateName={onUpdateName} />
        </ExpandableRow>
        <View style={styles.rowDivider} />
        <ExpandableRow label="Senha" summary="••••••••">
          <PasswordForm />
        </ExpandableRow>
      </View>

      <Pressable style={styles.card} onPress={onSignOut}>
        <View style={styles.menuRow}>
          <LogOut size={18} color={colors.down} />
          <Text style={[styles.menuRowLabel, { color: colors.down }]}>Sair</Text>
        </View>
      </Pressable>
    </View>
  );
}

function HistorySection({
  items,
  onOpen,
}: {
  items: StoredAnalysis[];
  onOpen: (item: StoredAnalysis) => void;
}) {
  if (items.length === 0) {
    return (
      <View style={styles.card}>
        <View style={{ alignItems: "center", paddingVertical: 20, gap: 8 }}>
          <Clock size={20} color={colors.subtle} />
          <Text style={styles.menuRowHint}>Nenhuma análise ainda</Text>
        </View>
      </View>
    );
  }

  const recent = items.slice(0, 10);

  return (
    <View style={{ gap: 6 }}>
      {recent.map((item) => (
        <Pressable key={item.id} style={styles.historyRow} onPress={() => onOpen(item)}>
          {item.thumbUri ? (
            <Image source={{ uri: item.thumbUri }} style={styles.thumb} />
          ) : (
            <View style={styles.thumbFallback}>
              <Text style={styles.thumbFallbackText}>{item.displayTicker.split("/")[0]}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.historyTitle} numberOfLines={1}>
              {item.displayTicker}
              <Text style={{ color: colors.muted, fontWeight: "400" }}>
                {" "}· {timeframeLabel(item.timeframe)}
              </Text>
            </Text>
            <Text style={styles.historySubtitle}>
              {item.precedent.matches} precedentes · {formatWhen(item.createdAt)}
            </Text>
          </View>
          <ChevronRight size={16} color={colors.subtle} />
        </Pressable>
      ))}
      {items.length > 10 ? (
        <Text style={styles.moreHint}>{items.length - 10} análises anteriores</Text>
      ) : null}
    </View>
  );
}

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
      <Pressable style={styles.menuRow} onPress={() => setOpen((o) => !o)}>
        <Text style={styles.menuRowLabel}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1, justifyContent: "flex-end" }}>
          {!open ? <Text style={styles.menuRowHint}>{summary}</Text> : null}
          {open ? (
            <ChevronDown size={16} color={colors.subtle} />
          ) : (
            <ChevronRight size={16} color={colors.subtle} />
          )}
        </View>
      </Pressable>
      {open ? <View style={{ marginTop: 10, gap: 8, paddingHorizontal: 4 }}>{children}</View> : null}
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
        <Pressable style={[styles.actionBtn, { height: 40 }]} disabled={busy} onPress={() => void save()}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.accentFg} />
          ) : (
            <Text style={styles.actionBtnText}>Salvar</Text>
          )}
        </Pressable>
      </View>
      {msg ? <Text style={styles.menuRowHint}>{msg}</Text> : null}
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
        style={[styles.actionBtn, { alignSelf: "flex-start" }]}
        disabled={busy}
        onPress={() => void save()}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.accentFg} />
        ) : (
          <Text style={styles.actionBtnText}>Atualizar senha</Text>
        )}
      </Pressable>
      {msg ? <Text style={[styles.menuRowHint, msg.ok && { color: colors.up }]}>{msg.text}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  screenTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: "700",
    color: colors.fg,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: colors.subtle,
    textTransform: "uppercase",
    marginTop: 8,
  },
  card: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 36,
  },
  menuRowLabel: { fontSize: 14, fontWeight: "500", color: colors.fg },
  menuRowHint: { fontSize: 12, color: colors.subtle },
  rowDivider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  input: {
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
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
    paddingVertical: 4,
  },
  actionBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: colors.accentFg },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  thumb: { width: 40, height: 40, borderRadius: radius.xs },
  thumbFallback: {
    width: 40,
    height: 40,
    borderRadius: radius.xs,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbFallbackText: { fontSize: 10, color: colors.muted },
  historyTitle: { fontSize: 13, fontWeight: "500", color: colors.fg },
  historySubtitle: { fontSize: 11, color: colors.muted, marginTop: 2 },
  moreHint: {
    fontSize: 11,
    color: colors.subtle,
    textAlign: "center",
    paddingVertical: 8,
  },
});
