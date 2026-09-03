import { useEffect, useState } from "react";
import { Columns3 } from "lucide-react";
import { Sparkline } from "@/components/sparkline";
import { formatPct, timeframeLabel } from "@/lib/market/labels";
import { sampleTitle } from "@/lib/market/sample-copy";
import type { WatchItem } from "@/lib/watchlist";
import { cn } from "@/lib/utils";

const MAX_SELECTED = 4;

type SparklineState =
  | { status: "loading" }
  | { status: "ok"; closes: number[] }
  | { status: "error" };

function useSparkline(item: WatchItem): SparklineState {
  const [state, setState] = useState<SparklineState>({ status: "loading" });

  useEffect(() => {
    setState({ status: "loading" });
    const controller = new AbortController();
    fetch(
      `/api/sparkline?symbol=${encodeURIComponent(item.ticker)}&interval=${item.timeframe}`,
      { signal: controller.signal },
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("sparkline"))))
      .then((body: { closes?: number[] }) => {
        if (Array.isArray(body.closes) && body.closes.length > 1) {
          setState({ status: "ok", closes: body.closes });
        } else {
          setState({ status: "error" });
        }
      })
      .catch(() => setState({ status: "error" }));
    return () => controller.abort();
  }, [item.ticker, item.timeframe]);

  return state;
}

function ComparatorCard({ item, onSelect }: { item: WatchItem; onSelect: () => void }) {
  const spark = useSparkline(item);
  const up = item.changePct >= 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col gap-2 rounded-md bg-bg p-3 text-left shadow-[var(--shadow-border)] transition hover:shadow-[var(--shadow-border-hover)]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-fg">
          {item.displayTicker.split("/")[0] ?? item.displayTicker}
        </span>
        <span className="text-[10px] text-subtle">{timeframeLabel(item.timeframe)}</span>
      </div>
      <div className="h-14">
        {spark.status === "ok" ? (
          <Sparkline closes={spark.closes} />
        ) : spark.status === "loading" ? (
          <p className="flex h-full items-center text-[10px] text-subtle">carregando série…</p>
        ) : (
          <p className="flex h-full items-center text-[10px] text-down">série indisponível</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
        <span className={cn("font-semibold", up ? "text-up" : "text-down")}>
          {formatPct(item.changePct, 1)}
        </span>
        <span className="text-muted">{sampleTitle(item.sampleNote)}</span>
        <span className="text-down">dd10 {formatPct(item.medianDrawdownPct, 1)}</span>
      </div>
    </button>
  );
}

type Props = {
  items: WatchItem[];
  onSelect: (item: WatchItem) => void;
  className?: string;
};

/**
 * Compara até 4 pares da watch lado a lado — sparkline + Δ% + amostra +
 * dd10 de cada um. Seleção começa com os 4 primeiros da lista (já
 * filtrada/ordenada por quem chama), o usuário troca clicando nos chips.
 */
export function WatchComparator({ items, onSelect, className }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    items.slice(0, MAX_SELECTED).map((i) => i.id),
  );

  if (items.length < 2) return null;

  function toggle(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (current.length >= MAX_SELECTED) return current;
      return [...current, id];
    });
  }

  const selected = items.filter((i) => selectedIds.includes(i.id));

  return (
    <div className={cn("rounded-md bg-surface font-mono shadow-[var(--shadow-border)]", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="flex items-center gap-1.5 text-[10px] tracking-wide text-muted uppercase">
          <Columns3 className="size-3" />
          Comparador
        </p>
        <span className="text-[10px] tabular-nums text-subtle">{selected.length}/{MAX_SELECTED}</span>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
        {items.map((item) => {
          const active = selectedIds.includes(item.id);
          const disabled = !active && selectedIds.length >= MAX_SELECTED;
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(item.id)}
              className={cn(
                "h-6 rounded-sm px-2 text-[10px] font-medium",
                active ? "bg-accent text-accent-fg" : "bg-bg text-muted hover:text-fg disabled:opacity-40",
              )}
            >
              {item.displayTicker.split("/")[0] ?? item.displayTicker}
            </button>
          );
        })}
      </div>

      {selected.length === 0 ? (
        <p className="px-3 py-5 text-center text-[11px] text-muted">
          Escolha até {MAX_SELECTED} pares acima pra comparar.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
          {selected.map((item) => (
            <ComparatorCard key={item.id} item={item} onSelect={() => onSelect(item)} />
          ))}
        </div>
      )}
    </div>
  );
}
