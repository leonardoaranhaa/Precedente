import { useEffect, useState } from "react";
import { ArrowLeft, Eye, Maximize2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OhlcChart } from "@/components/ohlc-chart";
import { OnchainPanel } from "@/components/onchain-panel";
import { NewsContextPanel } from "@/components/news-context-panel";
import { PathChart } from "@/components/path-chart";
import { PrintReadingModal } from "@/components/print-reading-modal";
import { RiskRail } from "@/components/risk-rail";
import { SampleBanner } from "@/components/sample-banner";
import { ScenarioPanel } from "@/components/scenario-panel";
import { SplitBar } from "@/components/split-bar";
import { formatInt, formatPct, formatPrice, timeframeLabel } from "@/lib/market/labels";
import { TIMEFRAME_GROUPS, type StoredAnalysis, type Timeframe } from "@/lib/market/types";
import { DEFAULT_ALERT_RULES } from "@/lib/push/types";
import { recordRiskEvents } from "@/lib/risk-log";
import { cn } from "@/lib/utils";

type Props = {
  analysis: StoredAnalysis;
  onBack: () => void;
  watched?: boolean;
  onToggleWatch?: () => void;
  onChangeTimeframe?: (tf: Timeframe) => void;
  reanalyzing?: boolean;
  reanalyzeError?: string | null;
};

export function AnalysisResult({
  analysis,
  onBack,
  watched = false,
  onToggleWatch,
  onChangeTimeframe,
  reanalyzing = false,
  reanalyzeError = null,
}: Props) {
  const { snapshot, precedent, vision, onchain, newsContext } = analysis;
  const [horizonIdx, setHorizonIdx] = useState(
    Math.min(1, Math.max(0, precedent.horizons.length - 1)),
  );
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    const h10 = precedent.horizons.find((h) => h.bars === 10) ?? precedent.horizons[1];
    recordRiskEvents(analysis.id, {
      sampleWeak: precedent.sampleNote !== "ok",
      drawdownHigh:
        h10 != null && Math.abs(h10.medianDrawdownPct) >= DEFAULT_ALERT_RULES.drawdownThresholdPct,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.id]);

  const horizon = precedent.horizons[horizonIdx] ?? precedent.horizons[0]!;
  const up = snapshot.changePct >= 0;

  return (
    <article
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-col gap-4 pb-24",
        reanalyzing && "pointer-events-none opacity-70",
      )}
      data-testid="analysis-result"
    >
      <header className="space-y-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <div className="flex flex-wrap items-start gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Voltar" disabled={reanalyzing}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs tracking-wide text-muted uppercase">
              {analysis.source} · {timeframeLabel(analysis.timeframe)} · {formatInt(analysis.candleCount)} candles
              {reanalyzing ? " · reanalisando…" : ""}
            </p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-display text-2xl tracking-tight text-fg sm:text-3xl">
                {analysis.displayTicker}
              </h1>
              <span className="font-mono text-xl tabular-nums text-fg">{formatPrice(snapshot.last.c)}</span>
              <span className={cn("font-mono text-sm tabular-nums", up ? "text-up" : "text-down")}>
                {formatPct(snapshot.changePct)} vela
              </span>
            </div>
          </div>
          {onToggleWatch ? (
            <Button
              type="button"
              variant={watched ? "secondary" : "outline"}
              size="sm"
              onClick={onToggleWatch}
              disabled={reanalyzing}
              className="gap-1.5"
            >
              <Star className={cn("size-3.5", watched && "fill-current")} />
              {watched ? "Na watch" : "+ Watch"}
            </Button>
          ) : null}
        </div>
        {onChangeTimeframe ? (
          <div className="flex flex-wrap gap-1 rounded-lg bg-bg p-1 shadow-[var(--shadow-border)]">
            {TIMEFRAME_GROUPS.flatMap((g) => g.tfs).map((tf) => (
              <button
                key={tf}
                type="button"
                disabled={reanalyzing}
                onClick={() => {
                  if (tf === analysis.timeframe || reanalyzing) return;
                  onChangeTimeframe(tf);
                }}
                className={cn(
                  "h-9 min-w-12 rounded-md px-2 text-xs font-medium tabular-nums",
                  tf === analysis.timeframe
                    ? "bg-surface text-fg shadow-[var(--shadow-border)]"
                    : "text-muted hover:text-fg",
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        ) : null}
        {reanalyzeError ? (
          <p className="rounded-md bg-down/10 px-3 py-2 text-sm text-down">{reanalyzeError}</p>
        ) : null}
      </header>

      <SampleBanner sampleNote={precedent.sampleNote} matches={precedent.matches} />

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <h2 className="mb-3 text-xs tracking-wide text-muted uppercase">Série recente · OHLC + SMAs</h2>
        <OhlcChart data={analysis.chart} matches={precedent.chartMatches} />
      </section>

      <OnchainPanel onchain={onchain} />
      <NewsContextPanel newsContext={newsContext} />
      <ScenarioPanel analysis={analysis} />

      <section className="space-y-4 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xs tracking-wide text-muted uppercase">O que o preço fez depois</h2>
            <p className="mt-1 text-sm text-fg">{horizon.label}</p>
          </div>
          <div className="flex gap-1 rounded-md bg-bg p-1">
            {precedent.horizons.map((h, i) => (
              <button
                key={h.bars}
                type="button"
                onClick={() => setHorizonIdx(i)}
                className={cn(
                  "h-9 min-w-14 rounded-sm px-2 text-xs font-medium tabular-nums",
                  i === horizonIdx
                    ? "bg-surface text-fg shadow-[var(--shadow-border)]"
                    : "text-muted hover:text-fg",
                )}
              >
                {h.bars}b
              </button>
            ))}
          </div>
        </div>
        <SplitBar horizon={horizon} />
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <dt className="text-[10px] tracking-wide text-subtle uppercase">mediana</dt>
            <dd className="font-mono text-sm tabular-nums">{formatPct(horizon.medianPct)}</dd>
          </div>
          <div>
            <dt className="text-[10px] tracking-wide text-subtle uppercase">média</dt>
            <dd className="font-mono text-sm tabular-nums">{formatPct(horizon.meanPct)}</dd>
          </div>
          <div>
            <dt className="text-[10px] tracking-wide text-subtle uppercase">P10</dt>
            <dd className="font-mono text-sm tabular-nums">{formatPct(horizon.p10)}</dd>
          </div>
          <div>
            <dt className="text-[10px] tracking-wide text-subtle uppercase">P90</dt>
            <dd className="font-mono text-sm tabular-nums">{formatPct(horizon.p90)}</dd>
          </div>
        </dl>
        <PathChart horizon={horizon} />
      </section>

      <RiskRail snapshot={snapshot} precedent={precedent} horizon={horizon} />

      {analysis.thumb || vision || analysis.visionError ? (
        <section
          className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]"
          data-testid="vision-section"
        >
          {analysis.thumb ? (
            <button
              type="button"
              onClick={() => setPrintOpen(true)}
              className="group relative block w-full"
              title="Ampliar print"
            >
              <img
                src={analysis.thumb}
                alt="Print enviado"
                className="chart-print h-36 w-full object-cover object-top"
                data-testid="vision-thumb"
              />
              <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-bg/80 text-fg opacity-0 shadow-[var(--shadow-border)] transition group-hover:opacity-100">
                <Maximize2 className="size-3.5" />
              </span>
            </button>
          ) : null}
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-xs tracking-wide text-muted uppercase">
              <Eye className="size-3.5" />
              Leitura visual
            </div>
            {vision ? (
              <div data-testid="vision-reading">
                <p className="text-sm leading-relaxed text-fg">{vision.leitura}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="accent">tendência {vision.tendencia}</Badge>
                  {vision.padrao ? <Badge>{vision.padrao}</Badge> : null}
                  <Badge>confiança {vision.confianca}</Badge>
                </div>
              </div>
            ) : analysis.visionError ? (
              <p className="text-sm text-muted" data-testid="vision-error">
                {analysis.visionError}
              </p>
            ) : (
              <p className="text-sm text-muted">Nenhum print nesta análise.</p>
            )}
          </div>
        </section>
      ) : null}

      {analysis.thumb ? (
        <PrintReadingModal
          open={printOpen}
          onOpenChange={setPrintOpen}
          thumb={analysis.thumb}
          padrao={vision?.padrao ?? null}
          region={vision?.patternRegion ?? null}
        />
      ) : null}
    </article>
  );
}
