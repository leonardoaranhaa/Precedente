import { ExternalLink, Newspaper } from "lucide-react";
import type { NewsContextPayload } from "@/lib/market/types";
import { formatAgo } from "@/lib/market/labels";
import { cn } from "@/lib/utils";

/**
 * Painel de contexto de notícias no resultado da análise.
 * Só manchetes factuais — sem linguagem de compra/venda/entrada.
 */
export function NewsContextPanel({
  newsContext,
  className,
}: {
  newsContext: NewsContextPayload | null | undefined;
  className?: string;
}) {
  if (!newsContext) return null;

  const { items, coin, disclaimer } = newsContext;

  return (
    <section
      className={cn(
        "rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
        className,
      )}
      aria-label="Contexto de notícias"
    >
      <div className="flex items-start gap-2">
        <Newspaper className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-fg">
            Contexto · {coin || "notícias"}
          </h3>
          <p className="mt-0.5 text-xs text-subtle">{disclaimer}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-xs text-muted">
          Nenhuma manchete recente relacionada a {coin || "este ativo"} nas fontes
          agregadas.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.link} className="min-w-0">
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-1.5 text-sm text-fg hover:underline"
              >
                <span className="min-w-0 flex-1 leading-snug">{item.title}</span>
                <ExternalLink
                  className="mt-0.5 size-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </a>
              <p className="mt-0.5 text-[11px] text-subtle">
                {item.source}
                {item.publishedAt != null ? ` · ${formatAgo(item.publishedAt)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
