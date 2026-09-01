import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LogOut, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AccountMenu() {
  const { user, isPending } = useCurrentUserState();
  const [signingOut, setSigningOut] = useState(false);

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
        <button
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut().catch(() => setSigningOut(false));
          }}
          className="mt-3 flex w-full items-center gap-1.5 rounded-md bg-bg px-2.5 py-2 text-xs font-medium text-muted hover:text-fg disabled:cursor-wait"
        >
          <LogOut className="size-3.5" />
          {signingOut ? "Saindo…" : "Sair"}
        </button>
      </PopoverContent>
    </Popover>
  );
}
