import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { Mark } from "@/components/mark";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type Role = "superadmin" | "developer" | null;

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  plan: string;
  status: string;
  adminRole: Role;
};

type FeatureFlagRow = {
  key: string;
  label: string;
  enabled: boolean;
  source: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

type HealthPayload = {
  days: number;
  total: number;
  visionCount: number;
  visionCostUsd: number;
  topTickers: { ticker: string; count: number }[];
  circuits: Record<string, { state: string; consecutiveFailures: number }>;
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border px-6 py-4">
        <Link to="/" className="inline-flex items-center gap-2">
          <Mark className="size-5" />
          <span className="font-display text-lg tracking-tight">Precedente</span>
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const [role, setRole] = useState<Role | "loading">("loading");

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setRole(null);
      return;
    }
    fetch("/api/admin/whoami")
      .then((r) => r.json())
      .then((body: { role?: Role }) => setRole(body.role ?? null))
      .catch(() => setRole(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só precisa recarregar quando o id muda, não a cada nova identidade do objeto user
  }, [isPending, user?.id]);

  if (isPending || role === "loading") {
    return (
      <Shell>
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" />
          Carregando…
        </p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <p className="text-sm text-muted">
          Entre com uma conta autorizada pra acessar o painel admin.{" "}
          <Link to="/login" className="text-fg underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </Shell>
    );
  }

  if (!role) {
    return (
      <Shell>
        <p className="text-sm text-muted">
          {user.primaryEmail} não tem acesso admin. Peça pra alguém adicionar esse e-mail em
          SUPERADMIN_EMAILS ou DEVELOPER_EMAILS.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl tracking-tight">
            <ShieldCheck className="size-6 text-accent" />
            Painel admin
          </h1>
          <p className="mt-1 text-sm text-muted">
            {user.primaryEmail} ·{" "}
            <Badge variant={role === "superadmin" ? "accent" : "default"}>{role}</Badge>
          </p>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="health">Saúde</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersTab role={role} />
        </TabsContent>
        <TabsContent value="config">
          <ConfigTab role={role} />
        </TabsContent>
        <TabsContent value="health">
          <HealthTab />
        </TabsContent>
      </Tabs>
    </Shell>
  );
}

function UsersTab({ role }: { role: "superadmin" | "developer" }) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load(query: string) {
    setError(null);
    const url = query ? `/api/admin/users?q=${encodeURIComponent(query)}` : "/api/admin/users";
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Falha ao listar usuários."))))
      .then((body: { users: AdminUserRow[] }) => setUsers(body.users))
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao listar usuários."));
  }

  useEffect(() => {
    load("");
  }, []);

  async function togglePremium(u: AdminUserRow) {
    setBusyId(u.id);
    setError(null);
    try {
      const grant = u.plan !== "premium" || u.status !== "active";
      const res = await fetch("/api/admin/grant-premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id, grant }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Não foi possível atualizar o plano.");
      }
      load(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o plano.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou e-mail…"
          className="h-9 flex-1 rounded-md bg-surface px-3 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle focus:outline-none"
        />
        <button
          type="submit"
          className="h-9 rounded-md bg-surface px-3 text-xs font-medium text-muted shadow-[var(--shadow-border)] hover:text-fg"
        >
          Buscar
        </button>
      </form>

      {error ? <p className="text-xs text-down">{error}</p> : null}

      {users === null ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" />
          Carregando…
        </p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted">Nenhum usuário encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-md bg-surface shadow-[var(--shadow-border)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] tracking-wide text-subtle uppercase">
                <th className="px-3 py-2 font-medium">Usuário</th>
                <th className="px-3 py-2 font-medium">Plano</th>
                <th className="px-3 py-2 font-medium">Desde</th>
                <th className="px-3 py-2 font-medium">Role</th>
                {role === "superadmin" ? <th className="px-3 py-2 font-medium">Ação</th> : null}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const active = u.plan === "premium" && u.status === "active";
                return (
                  <tr key={u.id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2">
                      <p className="font-medium text-fg">{u.name}</p>
                      <p className="text-xs text-subtle">{u.email}</p>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={active ? "up" : "default"}>{active ? "premium" : "free"}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">{u.adminRole ?? "—"}</td>
                    {role === "superadmin" ? (
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => void togglePremium(u)}
                          className="rounded-sm bg-bg px-2 py-1 text-[11px] font-medium text-muted hover:text-fg disabled:cursor-wait disabled:opacity-50"
                        >
                          {busyId === u.id ? "…" : active ? "Revogar Premium" : "Conceder Premium"}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs leading-relaxed text-subtle">
        Conceder/revogar aqui é um override manual — se o usuário tiver uma assinatura Stripe
        real, o próximo evento de cobrança sobrescreve isso.
      </p>
    </div>
  );
}

function ConfigTab({ role }: { role: "superadmin" | "developer" }) {
  const [flags, setFlags] = useState<FeatureFlagRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  function load() {
    setError(null);
    fetch("/api/admin/flags")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Falha ao carregar config."))))
      .then((body: { flags: FeatureFlagRow[] }) => setFlags(body.flags))
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar config."));
  }

  useEffect(load, []);

  async function toggle(flag: FeatureFlagRow) {
    setBusyKey(flag.key);
    setError(null);
    try {
      const res = await fetch("/api/admin/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: flag.key, enabled: !flag.enabled }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Não foi possível salvar.");
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-xs text-down">{error}</p> : null}
      {flags === null ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" />
          Carregando…
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-md bg-surface shadow-[var(--shadow-border)]">
          {flags.map((f) => (
            <li key={f.key} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-fg">{f.label}</p>
                <p className="mt-0.5 text-xs text-subtle">
                  fonte: {f.source}
                  {f.updatedBy ? ` · alterado por ${f.updatedBy}` : ""}
                </p>
              </div>
              {role === "superadmin" ? (
                <button
                  type="button"
                  disabled={busyKey === f.key}
                  onClick={() => void toggle(f)}
                  className={cn(
                    "h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
                    f.enabled ? "bg-accent" : "bg-bg",
                  )}
                  aria-pressed={f.enabled}
                  aria-label={f.label}
                >
                  <span
                    className={cn(
                      "block size-5 translate-x-0.5 rounded-full bg-surface shadow transition-transform",
                      f.enabled && "translate-x-5",
                    )}
                  />
                </button>
              ) : (
                <Badge variant={f.enabled ? "up" : "default"}>{f.enabled ? "ligado" : "desligado"}</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs leading-relaxed text-subtle">
        Desenvolvedor vê o estado das flags, só superadmin altera — muda o comportamento pra
        todo mundo, não só pra quem está testando.
      </p>
    </div>
  );
}

function HealthTab() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ops/analysis?days=7")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Falha ao carregar saúde."))))
      .then((body: HealthPayload) => setHealth(body))
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar saúde."));
  }, []);

  if (error) return <p className="text-xs text-down">{error}</p>;
  if (!health) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" />
        Carregando…
      </p>
    );
  }

  const circuitEntries = Object.entries(health.circuits);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={`Análises (${health.days}d)`} value={health.total.toLocaleString("pt-BR")} />
        <Stat label="Leituras de print" value={health.visionCount.toLocaleString("pt-BR")} />
        <Stat
          label="Custo de visão"
          value={`US$ ${health.visionCostUsd.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
        />
      </div>

      <div className="rounded-md bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="text-xs tracking-wide text-muted uppercase">Pares mais analisados</p>
        {health.topTickers.length === 0 ? (
          <p className="mt-2 text-sm text-subtle">Sem dados no período.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {health.topTickers.map((t) => (
              <li key={t.ticker} className="flex items-center justify-between text-sm">
                <span className="text-fg">{t.ticker}</span>
                <span className="tabular-nums text-muted">{t.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="text-xs tracking-wide text-muted uppercase">Circuit breakers</p>
        {circuitEntries.length === 0 ? (
          <p className="mt-2 text-sm text-subtle">Nenhum circuito acionado desde o último deploy.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {circuitEntries.map(([name, s]) => (
              <li key={name} className="flex items-center justify-between text-sm">
                <span className="text-fg">{name}</span>
                <Badge variant={s.state === "open" ? "down" : "up"}>
                  {s.state} · {s.consecutiveFailures} falhas seguidas
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs leading-relaxed text-subtle">
        Não inclui log de erro (Sentry) — isso só existe direto no Sentry hoje, não há API de
        consulta ligada ao app. Aqui é só o que o próprio app já registra: volume/custo de
        análise e estado dos circuit breakers.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface p-4 shadow-[var(--shadow-border)]">
      <p className="text-xs tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl tracking-tight">{value}</p>
    </div>
  );
}
