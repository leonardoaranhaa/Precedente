import { useState } from "react";
import { Clock, Search, Trash2 } from "lucide-react";
import { formatWhen, timeframeLabel } from "@/lib/market/labels";
import type { StoredAnalysis } from "@/lib/market/types";

export function HistoryPanel({
  items,
  onOpen,
  onDelete,
  synced = false,
}: {
  items: StoredAnalysis[];
  onOpen: (item: StoredAnalysis) => void;
  onDelete?: (id: string) => void;
  synced?: boolean;
}) {
  const [query, setQuery] = useState("");

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Clock className="size-6 text-subtle" />
        <p className="text-sm text-muted">Nenhuma análise ainda.</p>
        <p className="max-w-xs text-xs text-subtle">
          {synced
            ? "Sincronizado na sua conta — aparece nos outros aparelhos também."
            : "As leituras ficam neste aparelho. Nada é enviado a uma conta."}
        </p>
      </div>
    );
  }

  const q = query.trim().toUpperCase();
  const filtered = q
    ? items.filter((a) => a.displayTicker.toUpperCase().includes(q))
    : items;

  return (
    <div className="space-y-3">
      {items.length > 3 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no histórico..."
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-xs text-fg placeholder:text-subtle focus:border-ring focus:outline-none"
          />
        </div>
      )}

      {filtered.length === 0 && q && (
        <p className="py-8 text-center text-xs text-muted">
          Nenhuma análise para "{query.trim()}"
        </p>
      )}

      <ul className="space-y-2">
        {filtered.map((item) => (
          <li key={item.id} className="group relative">
            <button
              type="button"
              onClick={() => onOpen(item)}
              className="flex w-full items-center gap-3 rounded-xl bg-surface p-3 text-left shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
            >
              {item.thumb ? (
                <img
                  src={item.thumb}
                  alt=""
                  className="chart-print size-14 shrink-0 rounded-md object-cover"
                />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-bg font-mono text-xs text-muted">
                  {item.displayTicker.split("/")[0]}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">
                  {item.displayTicker}
                  <span className="ml-2 text-muted">· {timeframeLabel(item.timeframe)}</span>
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {item.precedent.matches} precedentes · {formatWhen(item.createdAt)}
                </span>
              </span>
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="absolute right-2 top-2 rounded-md p-1.5 text-subtle opacity-0 transition-opacity hover:bg-bg hover:text-down group-hover:opacity-100"
                aria-label={`Remover ${item.displayTicker}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
