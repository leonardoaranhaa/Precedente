import { Clock } from "lucide-react";
import { formatWhen, timeframeLabel } from "@/lib/market/labels";
import type { StoredAnalysis } from "@/lib/market/types";

export function HistoryPanel({
  items,
  onOpen,
  synced = false,
}: {
  items: StoredAnalysis[];
  onOpen: (item: StoredAnalysis) => void;
  /** Conta logada: o histórico sincroniza entre aparelhos em vez de ficar só local. */
  synced?: boolean;
}) {
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

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
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
        </li>
      ))}
    </ul>
  );
}
