import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Bell, Loader2, RefreshCw, Star, Trash2 } from "lucide-react";
import { formatAgo, formatPct, timeframeLabel } from "@/lib/market/labels";
import {
  applyQuickFilter,
  filterByTab,
  filterByTimeframe,
  quickFilterLabel,
  sortWatch,
  WATCH_QUICK_FILTERS,
  WATCH_TABS,
  WATCH_TF_FILTER_ALL,
  type WatchQuickFilter,
  type WatchSortDir,
  type WatchSortKey,
  type WatchTab,
  type WatchTfFilter,
} from "@/lib/market/watch-filters";
import {
  TIMEFRAMES,
  WATCH_REFRESH_MINUTES,
  type WatchRefreshMinutes,
} from "@/lib/market/types";
import { watchRefreshLabel } from "@/lib/watch-refresh";
import type { WatchItem } from "@/lib/watchlist";
import { cn } from "@/lib/utils";

type Props = {
  items: WatchItem[];
  focusIds?: string[];
  activeId?: string | null;
  refreshingId?: string | null;
  refreshingAll?: boolean;
  error?: string | null;
  autoRefreshMin?: WatchRefreshMinutes;
  onAutoRefreshMin?: (v: WatchRefreshMinutes) => void;
  onSelect: (item: WatchItem) => void;
  onRemove: (id: string) => void;
  onRefresh?: (item: WatchItem) => void;
  onRefreshAll?: () => void;
  className?: string;
};

const TAB_LABEL: Record<WatchTab, string> = {
  mine: "watch",
  focus: "foco",
  fragile: "frágeis",
};

/**
 * Zona vem só do app mobile (via sync de conta) — é lá que o push é
 * entregue, o web não tem registro de push. Aqui é só leitura: mostra o
 * que está configurado, nunca deixa editar (editar aqui prometeria um
 * alerta que o navegador não consegue disparar).
 */
function zoneSummary(item: WatchItem): string | null {
  const parts: string[] = [];
  const pz = item.priceZone;
  if (pz?.enabled && (pz.min != null || pz.max != null)) {
    if (pz.min != null && pz.max != null) parts.push(`preço ${pz.min}–${pz.max}`);
    else if (pz.min != null) parts.push(`preço ≥ ${pz.min}`);
    else parts.push(`preço ≤ ${pz.max}`);
  }
  const rz = item.rsiZone;
  if (rz?.enabled && (rz.below != null || rz.above != null)) {
    if (rz.below != null) parts.push(`RSI ≤ ${rz.below}`);
    if (rz.above != null) parts.push(`RSI ≥ ${rz.above}`);
  }
  if (parts.length === 0) return null;
  return `Zona de alerta ativa (configurada no app): ${parts.join(" · ")}`;
}

function signal(item: WatchItem): { glyph: string; tone: "up" | "warn" | "muted"; title: string } {
  if (item.near20High || item.near20Low) {
    return { glyph: "▲", tone: "warn", title: "Colado num extremo de 20 barras" };
  }
  if (item.sampleNote !== "ok") {
    return { glyph: "○", tone: "warn", title: "Amostra frágil" };
  }
  return { glyph: "●", tone: "up", title: "Amostra ok, sem extremo" };
}

export function WatchPanel({
  items,
  focusIds = [],
  activeId,
  refreshingId = null,
  refreshingAll = false,
  error = null,
  autoRefreshMin = 0,
  onAutoRefreshMin,
  onSelect,
  onRemove,
  onRefresh,
  onRefreshAll,
  className,
}: Props) {
  const richView = Boolean(onRefreshAll);

  const [tab, setTab] = useState<WatchTab>("mine");
  const [quickFilter, setQuickFilter] = useState<WatchQuickFilter>("all");
  const [tfFilter, setTfFilter] = useState<WatchTfFilter>(WATCH_TF_FILTER_ALL);
  const [sortKey, setSortKey] = useState<WatchSortKey | null>(null);
  const [sortDir, setSortDir] = useState<WatchSortDir>("desc");

  const visible = useMemo(() => {
    if (!richView) return items;
    let out = filterByTab(items, tab, focusIds);
    out = applyQuickFilter(out, quickFilter);
    out = filterByTimeframe(out, tfFilter);
    if (sortKey) out = sortWatch(out, sortKey, sortDir);
    return out;
  }, [items, richView, tab, focusIds, quickFilter, tfFilter, sortKey, sortDir]);

  function toggleSort(key: WatchSortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
      return;
    }
    if (sortDir === "desc") {
      setSortDir("asc");
      return;
    }
    setSortKey(null);
  }

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "rounded-md bg-surface p-3 text-xs leading-relaxed text-muted shadow-[var(--shadow-border)]",
          className,
        )}
      >
        <p className="flex items-center gap-1.5 text-[10px] tracking-wide text-muted uppercase">
          <Star className="size-3" />
          Watch
        </p>
        <p className="mt-2">
          Nenhum par pinado. Após uma análise, use <span className="text-fg">+ Watch</span> para
          acompanhar amostra e drawdown aqui.
        </p>
      </div>
    );
  }

  const busy = refreshingAll || refreshingId != null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md bg-surface font-mono shadow-[var(--shadow-border)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5">
        <p className="flex items-center gap-1.5 text-[10px] tracking-wide text-muted uppercase">
          <Star className="size-3" />
          Watch
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums text-subtle">
            {visible.length}
            {visible.length !== items.length ? `/${items.length}` : ""}
          </span>
          {onRefreshAll ? (
            <button
              type="button"
              disabled={busy}
              onClick={onRefreshAll}
              className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-fg hover:bg-bg disabled:opacity-50"
              title="Reavaliar todos"
            >
              {refreshingAll ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              reavaliar
            </button>
          ) : null}
        </div>
      </div>

      {richView && onAutoRefreshMin ? (
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
          <span className="mr-1 text-[9px] tracking-wide text-subtle uppercase">auto</span>
          {WATCH_REFRESH_MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onAutoRefreshMin(m)}
              className={cn(
                "h-5 rounded-sm px-1.5 text-[10px] font-medium",
                autoRefreshMin === m
                  ? "bg-accent text-accent-fg"
                  : "bg-bg text-muted hover:text-fg",
              )}
              title={
                m === 0
                  ? "Desliga atualização automática"
                  : `Reavalia a watch a cada ${m} min nesta aba aberta — não é preço ao vivo e não envia push (isso é outro sistema, veja o sino na Watch)`
              }
            >
              {watchRefreshLabel(m)}
            </button>
          ))}
        </div>
      ) : null}

      {richView ? (
        <>
          <div className="flex gap-0.5 border-b border-border bg-bg/40 p-1">
            {WATCH_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "h-6 flex-1 rounded-sm text-[10px] font-medium uppercase tracking-wide",
                  tab === t ? "bg-surface text-fg shadow-[var(--shadow-border)]" : "text-muted hover:text-fg",
                )}
              >
                {TAB_LABEL[t]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 border-b border-border px-2 py-1.5">
            {WATCH_QUICK_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setQuickFilter(f)}
                className={cn(
                  "h-5 rounded-sm px-1.5 text-[10px] font-medium",
                  quickFilter === f ? "bg-accent text-accent-fg" : "bg-bg text-muted hover:text-fg",
                )}
              >
                {quickFilterLabel(f)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
            <span className="mr-1 text-[9px] tracking-wide text-subtle uppercase">tf</span>
            <button
              type="button"
              onClick={() => setTfFilter(WATCH_TF_FILTER_ALL)}
              className={cn(
                "h-5 rounded-sm px-1.5 text-[10px] font-medium",
                tfFilter === WATCH_TF_FILTER_ALL
                  ? "bg-accent text-accent-fg"
                  : "bg-bg text-muted hover:text-fg",
              )}
            >
              todos
            </button>
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTfFilter(tf)}
                className={cn(
                  "h-5 rounded-sm px-1.5 text-[10px] font-medium",
                  tfFilter === tf ? "bg-accent text-accent-fg" : "bg-bg text-muted hover:text-fg",
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {error ? (
        <p className="border-b border-border bg-down/10 px-2 py-1.5 text-[11px] text-down">{error}</p>
      ) : null}

      <div className="grid grid-cols-[1fr_2rem_3rem_0.9rem_3rem_2.5rem] items-center gap-x-1.5 border-b border-border px-2 py-1 text-[9px] tracking-wide text-subtle uppercase">
        <span>par</span>
        <span className="text-right">rsi</span>
        {richView ? (
          <SortHeader label="Δ" active={sortKey === "delta"} dir={sortDir} onClick={() => toggleSort("delta")} />
        ) : (
          <span className="text-right">Δ</span>
        )}
        {richView ? (
          <button
            type="button"
            onClick={() => toggleSort("sample")}
            title="Ordenar por amostra"
            className={cn(
              "flex items-center justify-center hover:text-fg",
              sortKey === "sample" && "text-fg",
            )}
          >
            {sortKey === "sample" ? (
              sortDir === "desc" ? (
                <ArrowDown className="size-2.5" />
              ) : (
                <ArrowUp className="size-2.5" />
              )
            ) : (
              "·"
            )}
          </button>
        ) : (
          <span className="text-center">·</span>
        )}
        {richView ? (
          <SortHeader label="dd10" active={sortKey === "dd"} dir={sortDir} onClick={() => toggleSort("dd")} />
        ) : (
          <span className="text-right">dd10</span>
        )}
        <span />
      </div>

      {richView && visible.length === 0 ? (
        <p className="px-2 py-5 text-center text-[11px] text-muted">Nada nesse filtro agora.</p>
      ) : (
        <ul className="max-h-[min(65vh,460px)] overflow-y-auto">
          {visible.map((item) => {
            const active = activeId === item.id;
            const up = item.changePct >= 0;
            const sig = signal(item);
            const zone = zoneSummary(item);
            const rowBusy = refreshingId === item.id || refreshingAll;
            return (
              <li
                key={item.id}
                className={cn("group border-b border-border last:border-b-0", rowBusy && "opacity-60")}
              >
                <div
                  className={cn(
                    "grid grid-cols-[1fr_2rem_3rem_0.9rem_3rem_2.5rem] items-center gap-x-1.5 px-2 py-1.5",
                    active ? "bg-bg-elevated" : "hover:bg-bg-elevated/60",
                  )}
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSelect(item)}
                    className="flex min-w-0 items-baseline gap-1 text-left disabled:cursor-wait"
                  >
                    {refreshingId === item.id ? (
                      <Loader2 className="size-2.5 shrink-0 animate-spin text-subtle" />
                    ) : null}
                    <span className="shrink-0 text-xs font-semibold text-fg">
                      {item.displayTicker.split("/")[0] ?? item.displayTicker}
                    </span>
                    {zone ? (
                      <span title={zone} className="shrink-0">
                        <Bell className="size-2.5 text-accent" aria-label="Zona de alerta ativa" />
                      </span>
                    ) : null}
                    <span
                      className="min-w-0 truncate text-[10px] text-subtle"
                      title={`Última avaliação: ${new Date(item.updatedAt).toLocaleString("pt-BR")}`}
                    >
                      {refreshingId === item.id
                        ? "reavaliando…"
                        : timeframeLabel(item.timeframe).replace(" horas", "h").replace(" hora", "h")}
                      {" · "}
                      {formatAgo(item.updatedAt)}
                    </span>
                  </button>
                  <span className="text-right text-[11px] tabular-nums text-muted">
                    {item.rsi14.toFixed(0)}
                  </span>
                  <span className={cn("text-right text-[11px] tabular-nums", up ? "text-up" : "text-down")}>
                    {formatPct(item.changePct, 1)}
                  </span>
                  <span
                    className={cn(
                      "text-center text-[11px] leading-none",
                      sig.tone === "up" && "text-up",
                      sig.tone === "warn" && "text-warn",
                    )}
                    title={sig.title}
                  >
                    {sig.glyph}
                  </span>
                  <span className="text-right text-[11px] tabular-nums text-down">
                    {formatPct(item.medianDrawdownPct, 1)}
                  </span>
                  <span className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100">
                    {onRefresh ? (
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Reavaliar ${item.displayTicker}`}
                        title="Reavaliar agora"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRefresh(item);
                        }}
                        className="rounded-sm p-0.5 text-subtle hover:bg-bg hover:text-fg disabled:opacity-40"
                      >
                        {refreshingId === item.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <RefreshCw className="size-3" />
                        )}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Remover ${item.displayTicker} da watch`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(item.id);
                      }}
                      className="rounded-sm p-0.5 text-subtle hover:bg-bg hover:text-fg disabled:opacity-40"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: WatchSortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex items-center justify-end gap-0.5 text-right uppercase hover:text-fg", active && "text-fg")}
    >
      {label}
      {active ? dir === "desc" ? <ArrowDown className="size-2.5" /> : <ArrowUp className="size-2.5" /> : null}
    </button>
  );
}
