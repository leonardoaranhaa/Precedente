import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NewsPreferencesModal } from "@/components/news-preferences-modal";
import { fetchNewsFeed } from "@/lib/news/client";
import { NEWS_CATEGORIES, type NewsItem } from "@/lib/news/types";
import { formatAgo } from "@/lib/market/labels";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL = Object.fromEntries(NEWS_CATEGORIES.map((c) => [c.id, c.label]));

export function NewsPanel({ className }: { className?: string }) {
  const { user } = useCurrentUserState();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFilter, setHasFilter] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNewsFeed();
      setItems(res.items);
      setHasFilter(res.matched !== res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível buscar notícias.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, user?.id]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Notícias</h1>
          <p className="mt-1 text-sm text-muted">
            {user
              ? hasFilter
                ? "Filtrado pelas suas preferências."
                : "Sem filtro salvo — mostrando tudo. Ajuste em Preferências."
              : "Entre na sua conta pra filtrar por moeda e categoria."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Atualizar"
            className="flex size-9 items-center justify-center rounded-md bg-surface text-muted shadow-[var(--shadow-border)] hover:text-fg disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </button>
          <NewsPreferencesModal
            onSaved={() => void load()}
            trigger={
              <button
                type="button"
                aria-label="Preferências de notícias"
                className="flex size-9 items-center justify-center rounded-md bg-surface text-muted shadow-[var(--shadow-border)] hover:text-fg"
              >
                <Settings2 className="size-4" />
              </button>
            }
          />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {loading ? (
          <NewsSkeleton />
        ) : error ? (
          <p className="rounded-md bg-surface p-4 text-sm text-down shadow-[var(--shadow-border)]">{error}</p>
        ) : items.length === 0 ? (
          <p className="rounded-md bg-surface p-6 text-center text-sm text-muted shadow-[var(--shadow-border)]">
            {hasFilter
              ? "Nenhuma notícia recente bate com suas preferências. Tente ampliar os filtros."
              : "Nenhuma notícia disponível agora — as fontes podem estar fora do ar. Tente atualizar em instantes."}
          </p>
        ) : (
          items.map((item) => <NewsRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

function NewsRow({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex flex-col gap-1.5 rounded-md bg-surface p-4 shadow-[var(--shadow-border)] hover:bg-bg-elevated"
    >
      <div className="flex items-center justify-between gap-2 text-xs text-subtle">
        <span>
          {item.source}
          {item.publishedAt ? ` · ${formatAgo(item.publishedAt)}` : ""}
        </span>
        <ExternalLink className="size-3.5 shrink-0 opacity-0 group-hover:opacity-100" />
      </div>
      <p className="text-sm leading-snug text-fg">{item.title}</p>
      {item.coins.length > 0 || item.categories.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {item.coins.map((c) => (
            <Badge key={c} variant="accent">
              {c}
            </Badge>
          ))}
          {item.categories.map((c) => (
            <Badge key={c} variant="default">
              {CATEGORY_LABEL[c] ?? c}
            </Badge>
          ))}
        </div>
      ) : null}
    </a>
  );
}

function NewsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="h-[74px] animate-pulse rounded-md bg-surface shadow-[var(--shadow-border)]"
        />
      ))}
    </div>
  );
}
