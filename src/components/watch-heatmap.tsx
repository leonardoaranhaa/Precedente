import { formatPct, timeframeLabel } from "@/lib/market/labels";
import { isFragile } from "@/lib/market/watch-filters";
import type { WatchItem } from "@/lib/watchlist";
import { cn } from "@/lib/utils";

type Props = {
  items: WatchItem[];
  activeId?: string | null;
  onSelect: (item: WatchItem) => void;
  /** Grade fixa em 2 colunas — pro rail estreito (300px) e pro painel da watch. */
  compact?: boolean;
  className?: string;
};

/** 12%..80% de opacidade — visível mesmo perto de 0%, mas nunca lava o texto. */
function intensity(changePct: number): number {
  const clamped = Math.min(Math.abs(changePct), 5);
  return 0.12 + (clamped / 5) * 0.68;
}

/**
 * Visão geral da watchlist inteira num relance: cor por Δ%, anel âmbar pra
 * quem está colado num extremo de 20 barras, "○" pra amostra frágil ou
 * drawdown alto. Mesmos campos que já existem em WatchItem — nenhum fetch
 * novo, só outra forma de olhar o que a watch já carrega.
 */
export function WatchHeatmap({ items, activeId, onSelect, compact = false, className }: Props) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-1.5",
        compact ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5",
        className,
      )}
    >
      {items.map((item) => {
        const up = item.changePct >= 0;
        const active = activeId === item.id;
        const extreme = item.near20High || item.near20Low;
        const fragile = isFragile(item);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            title={`${item.displayTicker} · ${timeframeLabel(item.timeframe)} · rsi ${item.rsi14.toFixed(0)}${fragile ? " · amostra frágil ou drawdown alto" : ""}`}
            className={cn(
              "relative overflow-hidden rounded-md bg-surface p-2 text-left shadow-[var(--shadow-border)] transition hover:shadow-[var(--shadow-border-hover)]",
              extreme ? "ring-1 ring-warn" : active ? "ring-1 ring-accent" : "",
            )}
          >
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundColor: up ? "var(--color-up)" : "var(--color-down)",
                opacity: intensity(item.changePct),
              }}
            />
            <span className="relative flex flex-col gap-0.5">
              <span className="flex items-center justify-between gap-1">
                <span className="truncate text-xs font-semibold text-fg">
                  {item.displayTicker.split("/")[0] ?? item.displayTicker}
                </span>
                {fragile ? (
                  <span className="shrink-0 text-[10px] leading-none text-warn">○</span>
                ) : null}
              </span>
              <span className={cn("text-sm font-semibold tabular-nums", up ? "text-up" : "text-down")}>
                {formatPct(item.changePct, 1)}
              </span>
              <span className="text-[9px] tabular-nums text-subtle">rsi {item.rsi14.toFixed(0)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
