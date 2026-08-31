import { Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPct, formatPrice, timeframeLabel } from "@/lib/market/labels";
import type { WatchItem } from "@/lib/watchlist";
import { cn } from "@/lib/utils";

type Props = {
  items: WatchItem[];
  activeId?: string | null;
  onSelect: (item: WatchItem) => void;
  onRemove: (id: string) => void;
  className?: string;
};

export function WatchPanel({ items, activeId, onSelect, onRemove, className }: Props) {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl bg-surface p-4 text-sm leading-relaxed text-muted shadow-[var(--shadow-border)]",
          className,
        )}
      >
        <p className="flex items-center gap-2 text-xs tracking-wide text-muted uppercase">
          <Star className="size-3.5" />
          Watch
        </p>
        <p className="mt-3">
          Nenhum par pinado. Após uma análise, use <span className="text-fg">+ Watch</span> para
          acompanhar amostra e drawdown aqui.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="flex items-center gap-2 text-xs tracking-wide text-muted uppercase">
          <Star className="size-3.5" />
          Watch
        </p>
        <span className="font-mono text-[11px] tabular-nums text-subtle">{items.length}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 border-b border-border px-3 py-1.5 text-[10px] tracking-wide text-subtle uppercase">
        <span>Par</span>
        <span className="text-right">Δ</span>
        <span className="text-right">Amostra</span>
        <span className="text-right">DD10</span>
      </div>

      <ul className="max-h-[min(60vh,420px)] overflow-y-auto">
        {items.map((item) => {
          const active = activeId === item.id;
          const up = item.changePct >= 0;
          const sampleVariant =
            item.sampleNote === "ok" ? "up" : item.sampleNote === "small" ? "warn" : "down";
          const extreme = item.near20High || item.near20Low;
          return (
            <li key={item.id} className="group border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                  "grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-x-2 px-3 py-2.5 text-left transition-colors",
                  active ? "bg-bg-elevated" : "hover:bg-bg-elevated/60",
                )}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-fg">
                      {item.displayTicker.split("/")[0] ?? item.displayTicker}
                    </span>
                    {extreme ? (
                      <span className="text-[10px] text-warn" title="Extremo 20 barras">
                        ▲
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-[11px] text-subtle">
                    {timeframeLabel(item.timeframe)} · RSI {item.rsi14.toFixed(0)}
                  </span>
                </span>
                <span
                  className={cn(
                    "font-mono text-xs tabular-nums",
                    up ? "text-up" : "text-down",
                  )}
                >
                  {formatPct(item.changePct, 1)}
                </span>
                <Badge variant={sampleVariant} className="justify-self-end uppercase">
                  {item.sampleNote}
                </Badge>
                <span className="justify-self-end font-mono text-xs tabular-nums text-down">
                  {formatPct(item.medianDrawdownPct, 1)}
                </span>
              </button>
              <div className="flex items-center justify-between gap-2 px-3 pb-2">
                <span className="truncate font-mono text-[10px] tabular-nums text-subtle">
                  {formatPrice(item.price)}
                </span>
                <button
                  type="button"
                  aria-label={`Remover ${item.displayTicker} da watch`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                  className="rounded p-1 text-subtle opacity-60 hover:bg-bg hover:text-fg hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
