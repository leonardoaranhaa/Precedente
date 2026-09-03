import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { KNOWN_COINS } from "@/lib/news/classify";
import { getMyNewsPreferences, saveMyNewsPreferences } from "@/lib/news/client";
import { NEWS_CATEGORIES, type NewsCategory, type NewsPreferences } from "@/lib/news/types";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

type Props = {
  trigger: ReactNode;
  onSaved?: (prefs: NewsPreferences) => void;
};

export function NewsPreferencesModal({ trigger, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const { user } = useCurrentUserState();
  const [coins, setCoins] = useState<string[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestHourUtc, setDigestHourUtc] = useState(12);
  const [digestTokens, setDigestTokens] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMyNewsPreferences()
      .then((prefs) => {
        if (cancelled || !prefs) return;
        setCoins(prefs.coins);
        setCategories(prefs.categories);
        setDigestEnabled(Boolean(prefs.digestEnabled));
        setDigestHourUtc(
          typeof prefs.digestHourUtc === "number" ? prefs.digestHourUtc : 12,
        );
        setDigestTokens(Array.isArray(prefs.digestTokens) ? prefs.digestTokens : []);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar suas preferências.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // `user` do useCurrentUserState() é um objeto novo a cada render (não
    // memoizado) — depender dele (em vez de `user?.id`) reexecutaria isto a
    // cada render e entraria em loop com o próprio setLoading. Mesmo padrão
    // já usado em routes/index.tsx pra evitar essa armadilha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  function toggleCoin(coin: string) {
    setCoins((cs) => (cs.includes(coin) ? cs.filter((c) => c !== coin) : [...cs, coin]));
  }

  function toggleCategory(category: NewsCategory) {
    setCategories((cs) => (cs.includes(category) ? cs.filter((c) => c !== category) : [...cs, category]));
  }

  async function save() {
    if (!user || saving) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveMyNewsPreferences({
        coins,
        categories,
        digestEnabled,
        digestHourUtc,
        digestTokens,
      });
      onSaved?.(saved);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preferências de notícias</DialogTitle>
        </DialogHeader>

        {!user ? (
          <p className="text-sm text-muted">
            Entre na sua conta pra escolher moedas e categorias.{" "}
            <Link to="/login" className="text-fg underline-offset-4 hover:underline">
              Entrar
            </Link>
          </p>
        ) : (
          <div className="mt-2 space-y-5">
            <p className="text-xs text-subtle">
              Escolha o que acompanhar — deixe tudo desmarcado pra ver todas as notícias.
            </p>

            <div>
              <p className="mb-2 text-xs font-medium text-muted">Moedas</p>
              <div className="flex flex-wrap gap-1.5">
                {KNOWN_COINS.map((coin) => (
                  <ToggleChip key={coin} active={coins.includes(coin)} onClick={() => toggleCoin(coin)}>
                    {coin}
                  </ToggleChip>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted">Categorias</p>
              <div className="flex flex-wrap gap-1.5">
                {NEWS_CATEGORIES.map(({ id, label }) => (
                  <ToggleChip key={id} active={categories.includes(id)} onClick={() => toggleCategory(id)}>
                    {label}
                  </ToggleChip>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-bg p-3 shadow-[var(--shadow-border)]">
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[var(--accent)]"
                  checked={digestEnabled}
                  onChange={(e) => setDigestEnabled(e.target.checked)}
                />
                <span>
                  <span className="text-sm font-medium text-fg">Digest diário automático</span>
                  <span className="mt-0.5 block text-[11px] text-subtle">
                    Como uma automação agendada: envia manchetes filtradas por push no horário
                    escolhido (UTC). Só contexto factual — sem sinal de trade.
                  </span>
                </span>
              </label>
              {digestEnabled ? (
                <div className="mt-3 flex items-center gap-2 pl-6">
                  <label className="text-xs text-muted" htmlFor="digest-hour">
                    Hora (UTC)
                  </label>
                  <select
                    id="digest-hour"
                    className="h-8 rounded-md bg-surface px-2 text-xs text-fg shadow-[var(--shadow-border)]"
                    value={digestHourUtc}
                    onChange={(e) => setDigestHourUtc(Number(e.target.value))}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-subtle">
                    {digestTokens.length > 0
                      ? `${digestTokens.length} dispositivo(s) com push`
                      : "Ative notificações no app pra receber o digest"}
                  </span>
                </div>
              ) : null}
            </div>

            {error ? <p className="text-xs text-down">{error}</p> : null}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={() => void save()} disabled={saving || loading}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full px-3 text-xs font-medium shadow-[var(--shadow-border)]",
        active ? "bg-accent text-accent-fg" : "bg-surface text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
