import type { NewsContextPayload } from "@/lib/market/types";
import { formatWhen } from "@/lib/market/labels";
import { Badge } from "@/components/ui/badge";

const FLAG_LABEL: Record<string, string> = {
  regulatory: "Regulação",
  security: "Segurança",
  institutional: "Institucional",
  market: "Mercado",
  technology: "Tecnologia",
};

export function NewsContextPanel({ news }: { news: NewsContextPayload | null | undefined }) {
  if (!news || news.items.length === 0) return null;

  const activeFlags = Object.entries(news.flags)
    .filter(([, v]) => v)
    .map(([k]) => k);

  return (
    <section
      className="space-y-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]"
      data-testid="news-context-panel"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xs tracking-wide text-muted uppercase">
            Eventos recentes · manchetes
          </h2>
          <p className="mt-1 text-xs text-subtle">
            Últimas {news.windowHours}h ligadas a este ativo — contexto paralelo aos precedentes,
            não altera mediana/drawdown e não é ordem de compra ou venda.
          </p>
        </div>
        {activeFlags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {activeFlags.map((f) => (
              <Badge key={f} variant={f === "security" || f === "regulatory" ? "accent" : undefined}>
                {FLAG_LABEL[f] ?? f}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      <ul className="divide-y divide-border rounded-lg bg-bg shadow-[var(--shadow-border)]">
        {news.items.map((item) => (
          <li key={item.id} className="px-3 py-2.5">
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-fg hover:underline"
            >
              {item.title}
            </a>
            <p className="mt-0.5 text-[11px] text-muted">
              {item.source}
              {item.publishedAt != null ? ` · ${formatWhen(item.publishedAt)}` : ""}
              {item.categories.length > 0
                ? ` · ${item.categories.map((c) => FLAG_LABEL[c] ?? c).join(", ")}`
                : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
