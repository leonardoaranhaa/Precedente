import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadZone } from "@/components/upload-zone";
import { POPULAR_TICKERS, TIMEFRAMES, type Timeframe } from "@/lib/market/types";
import { normalizeTicker, shortTicker } from "@/lib/market/labels";
import { cn } from "@/lib/utils";

type Props = {
  ticker: string;
  timeframe: Timeframe;
  image: string | null;
  busy: boolean;
  error: string | null;
  topTraded: string[];
  onTicker: (v: string) => void;
  onTimeframe: (v: Timeframe) => void;
  onImage: (v: string | null) => void;
  onSubmit: () => void;
};

export function AnalyzeForm({
  ticker,
  timeframe,
  image,
  busy,
  error,
  topTraded,
  onTicker,
  onTimeframe,
  onImage,
  onSubmit,
}: Props) {
  const current = normalizeTicker(ticker);
  // Ranking ao vivo por volume 24h; a lista fixa cobre a falha da rede.
  const chips = topTraded.length > 0 ? topTraded.slice(0, 6) : [...POPULAR_TICKERS.slice(0, 6)];

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <UploadZone value={image} onChange={onImage} disabled={busy} />

      <div className="space-y-2">
        <label htmlFor="ticker" className="text-xs tracking-wide text-muted uppercase">
          Par
        </label>
        <Input
          id="ticker"
          name="ticker"
          value={ticker}
          onChange={(e) => onTicker(e.target.value)}
          placeholder="BTC, ETHUSDT, SOL…"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          disabled={busy}
          className="font-mono uppercase"
        />
        <div className="flex flex-wrap gap-1.5 pt-1">
          {chips.map((t) => {
            const active = current === t;
            return (
              <button
                key={t}
                type="button"
                disabled={busy}
                onClick={() => onTicker(shortTicker(t))}
                className={cn(
                  "h-9 rounded-full px-3 text-xs font-medium shadow-[var(--shadow-border)]",
                  active ? "bg-accent text-accent-fg" : "bg-surface text-muted hover:text-fg",
                )}
              >
                {shortTicker(t)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs tracking-wide text-muted uppercase">Tempo gráfico</p>
        <div className="flex gap-1 rounded-lg bg-surface p-1 shadow-[var(--shadow-border)]">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              disabled={busy}
              onClick={() => onTimeframe(tf)}
              className={cn(
                "h-10 flex-1 rounded-md text-sm font-medium transition-colors duration-150",
                timeframe === tf
                  ? "bg-bg-elevated text-fg shadow-[var(--shadow-border)]"
                  : "text-muted hover:text-fg",
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-md bg-down/10 px-3 py-2 text-sm text-down">{error}</p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={busy || !ticker.trim()}>
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Analisando
          </>
        ) : (
          "Analisar"
        )}
      </Button>
      <p className="text-center text-xs text-subtle">
        Sem print, a análise usa só o histórico real do par.
      </p>
    </form>
  );
}
