import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LogOut, ShieldCheck, Sparkles, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyEntitlement } from "@/lib/billing/entitlements";
import { openBillingPortal, startPremiumCheckout } from "@/lib/billing/checkout";
import { PLAN_LIMITS } from "@/lib/billing/plan-limits";
import { cn } from "@/lib/utils";

export function AccountMenu() {
  const { user, isPending } = useCurrentUserState();
  const [signingOut, setSigningOut] = useState(false);
  const [active, setActive] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<"superadmin" | "developer" | null>(null);

  useEffect(() => {
    if (!user) return;
    getMyEntitlement()
      .then((r) => setActive(r.active))
      .catch(() => setActive(false));
    fetch("/api/admin/whoami")
      .then((r) => r.json())
      .then((body: { role?: "superadmin" | "developer" | null }) => setAdminRole(body.role ?? null))
      .catch(() => setAdminRole(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só precisa recarregar quando o id muda, não a cada nova identidade do objeto user
  }, [user?.id]);

  if (isPending) return null;

  if (!user) {
    return (
      <Link
        to="/login"
        className="flex h-9 items-center rounded-md bg-surface px-3 text-xs font-medium text-muted shadow-[var(--shadow-border)] hover:text-fg"
      >
        Entrar
      </Link>
    );
  }

  const label = user.displayName ?? user.primaryEmail ?? "Conta";

  async function goToBilling() {
    setBillingError(null);
    setBillingBusy(true);
    try {
      const { url } = active ? await openBillingPortal() : await startPremiumCheckout();
      window.location.href = url;
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : "Não deu pra continuar agora.");
      setBillingBusy(false);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Conta"
          className="flex size-9 items-center justify-center rounded-md bg-surface text-muted shadow-[var(--shadow-border)] hover:text-fg"
        >
          {user.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="" className="size-9 rounded-md object-cover" />
          ) : (
            <User className="size-4" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end">
        <p className="truncate text-sm font-medium text-fg">{label}</p>
        {user.primaryEmail ? (
          <p className="truncate text-xs text-subtle">{user.primaryEmail}</p>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-bg px-2.5 py-2">
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              active ? "text-accent" : "text-subtle",
            )}
          >
            <Sparkles className="size-3.5" />
            {active ? "Premium ativo" : "Plano gratuito"}
          </span>
          <button
            type="button"
            disabled={billingBusy}
            onClick={() => void goToBilling()}
            className="rounded-sm bg-accent px-2 py-1 text-[11px] font-medium text-accent-fg hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
          >
            {billingBusy ? "Um instante…" : active ? "Gerenciar" : "Virar Premium"}
          </button>
        </div>
        {billingError ? (
          <p className="mt-1.5 text-[11px] leading-relaxed text-down">{billingError}</p>
        ) : null}
        {!active ? (
          <div className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-subtle">
            <p>
              Premium: até {PLAN_LIMITS.premium.maxWatches} pares em alerta, zonas de preço/RSI
              por ativo e até {PLAN_LIMITS.premium.visionPerDay} leituras de print/dia. Análise
              OHLC continua livre.
            </p>
            <p>
              Assinar não muda a tese do app: sempre estatística do passado, nunca recomendação.{" "}
              <Link to="/aviso-de-risco" className="underline-offset-4 hover:text-fg hover:underline">
                Aviso de risco
              </Link>
            </p>
          </div>
        ) : null}

        {adminRole ? (
          <Link
            to="/admin"
            className="mt-3 flex w-full items-center gap-1.5 rounded-md bg-bg px-2.5 py-2 text-xs font-medium text-muted hover:text-fg"
          >
            <ShieldCheck className="size-3.5" />
            Painel admin
          </Link>
        ) : null}

        <button
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut().catch(() => setSigningOut(false));
          }}
          className={cn(
            "flex w-full items-center gap-1.5 rounded-md bg-bg px-2.5 py-2 text-xs font-medium text-muted hover:text-fg disabled:cursor-wait",
            adminRole ? "mt-1.5" : "mt-3",
          )}
        >
          <LogOut className="size-3.5" />
          {signingOut ? "Saindo…" : "Sair"}
        </button>
      </PopoverContent>
    </Popover>
  );
}
