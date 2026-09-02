import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Laptop, Moon, Settings, Sun } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getStoredTheme, setTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "light", label: "Claro", icon: Sun },
  { value: "system", label: "Sistema", icon: Laptop },
];

export function SettingsModal() {
  const [open, setOpen] = useState(false);
  const { user } = useCurrentUserState();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Configurações"
          className="flex size-9 items-center justify-center rounded-md bg-surface text-muted shadow-[var(--shadow-border)] hover:text-fg"
        >
          <Settings className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="aparencia" className="mt-4">
          <TabsList>
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            <TabsTrigger value="aparencia">Aparência</TabsTrigger>
            <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            {user ? <ProfilePanel /> : <SignedOutHint />}
          </TabsContent>

          <TabsContent value="aparencia">
            <AppearancePanel />
          </TabsContent>

          <TabsContent value="notificacoes">
            <NotificationsPanel />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function SignedOutHint() {
  return (
    <p className="text-sm text-muted">
      Entre na sua conta pra ver e editar seu perfil.{" "}
      <Link to="/login" className="text-fg underline-offset-4 hover:underline">
        Entrar
      </Link>
    </p>
  );
}

function AppearancePanel() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  function choose(next: Theme) {
    setThemeState(next);
    setTheme(next);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-subtle">Como as telas do Precedente aparecem pra você.</p>
      <div className="grid grid-cols-3 gap-2">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-md border border-border bg-bg py-3 text-xs font-medium text-muted hover:text-fg",
              theme === value && "border-accent text-fg",
            )}
          >
            <Icon className="size-4" />
            {label}
            {theme === value ? <Check className="size-3 text-accent" /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function NotificationsPanel() {
  return (
    <div className="space-y-3 text-sm text-muted">
      <p>
        Alertas de preço ficam no app mobile — ative por par direto na sua Watch lá, e
        escolha se quer aviso quando o ativo sair da faixa de 20 barras.
      </p>
      <p className="text-xs text-subtle">
        No navegador ainda não mandamos notificação — só o app mobile avisa fora da tela.
      </p>
    </div>
  );
}

function ProfilePanel() {
  const { user } = useCurrentUserState();
  const [name, setName] = useState(user?.displayName ?? "");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (nameBusy || !name.trim()) return;
    setNameBusy(true);
    setNameMsg(null);
    try {
      const { error } = await authClient.updateUser({ name: name.trim() });
      if (error) {
        setNameMsg(error.message ?? "Não deu pra salvar.");
      } else {
        setNameMsg("Nome atualizado.");
        void authClient.getSession();
      }
    } catch {
      setNameMsg("Falha de rede. Tente de novo.");
    } finally {
      setNameBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordBusy || !currentPassword || newPassword.length < 8) return;
    setPasswordBusy(true);
    setPasswordMsg(null);
    try {
      const { error } = await authClient.changePassword({ currentPassword, newPassword });
      if (error) {
        setPasswordMsg({ text: error.message ?? "Não deu pra trocar a senha.", ok: false });
      } else {
        setPasswordMsg({ text: "Senha alterada.", ok: true });
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch {
      setPasswordMsg({ text: "Falha de rede. Tente de novo.", ok: false });
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-subtle">{user?.primaryEmail}</p>
      </div>

      <form onSubmit={(e) => void saveName(e)} className="space-y-2">
        <label className="text-xs font-medium text-muted" htmlFor="settings-name">
          Nome
        </label>
        <div className="flex gap-2">
          <Input
            id="settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={nameBusy}
          />
          <Button type="submit" variant="secondary" size="sm" disabled={nameBusy}>
            {nameBusy ? "…" : "Salvar"}
          </Button>
        </div>
        {nameMsg ? <p className="text-xs text-subtle">{nameMsg}</p> : null}
      </form>

      <form onSubmit={(e) => void changePassword(e)} className="space-y-2 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted">Trocar senha</p>
        <Input
          type="password"
          placeholder="Senha atual"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={passwordBusy}
        />
        <Input
          type="password"
          placeholder="Nova senha (mín. 8 caracteres)"
          autoComplete="new-password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={passwordBusy}
        />
        <Button type="submit" variant="secondary" size="sm" disabled={passwordBusy}>
          {passwordBusy ? "Um instante…" : "Atualizar senha"}
        </Button>
        {passwordMsg ? (
          <p className={cn("text-xs", passwordMsg.ok ? "text-up" : "text-down")}>{passwordMsg.text}</p>
        ) : null}
      </form>
    </div>
  );
}
