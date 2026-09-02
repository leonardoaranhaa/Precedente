import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({ component: Login });

type Mode = "signin" | "signup";

function Login() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPending && user) {
    void navigate({ to: "/" });
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === "signup"
          ? await authClient.signUp.email({ name: name.trim() || email, email, password })
          : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "Não deu pra continuar. Confira os dados.");
        return;
      }
      void navigate({ to: "/" });
    } catch {
      setError("Falha de rede. Tente de novo em instantes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-2">
          <Mark className="size-6" />
          <span className="font-display text-lg text-fg">Precedente</span>
        </div>

        <div className="space-y-1.5">
          <h1 className="font-display text-2xl text-fg">
            {mode === "signup" ? "Criar conta" : "Entrar"}
          </h1>
          <p className="text-sm text-muted">
            Conta é opcional — só pra sincronizar watch e histórico entre aparelhos.
            A análise continua funcionando sem login.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" ? (
            <Input
              type="text"
              placeholder="Nome"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          ) : null}
          <Input
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
          <Input
            type="password"
            placeholder="Senha"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />

          {error ? (
            <p className="rounded-md bg-down/10 px-3 py-2 text-sm text-down">{error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Um instante…" : mode === "signup" ? "Criar conta" : "Entrar"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "signup" ? "signin" : "signup"));
            setError(null);
          }}
          className={cn("text-sm text-muted underline-offset-4 hover:text-fg hover:underline")}
        >
          {mode === "signup" ? "Já tem conta? Entrar" : "Não tem conta? Criar uma"}
        </button>

        <p className="text-xs text-subtle">
          Ao continuar, você concorda com os{" "}
          <Link to="/termos" className="underline-offset-4 hover:text-fg hover:underline">
            termos de uso
          </Link>{" "}
          e a{" "}
          <Link to="/privacidade" className="underline-offset-4 hover:text-fg hover:underline">
            política de privacidade
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
