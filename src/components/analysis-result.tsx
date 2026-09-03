import { useState } from "react";
import {
  ArrowLeft,
  Eye,
  Loader2,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OhlcChart } from "@/components/ohlc-chart";
import { OnchainPanel } from "@/components/onchain-panel";
import { PathChart } from "@/components/path-chart";
import { RiskRail } from "@/components/risk-rail";
import { SampleBanner } from "@/components/sample-banner";
import { ScenarioPanel } from "@/components/scenario-panel";
import { SplitBar } from "@/components/split-bar";
import { baselineDeltaLabel } from "@/lib/market/baseline-copy";
import {
  barsToHuman,
  formatInt,
  formatPct,
  formatPrice,
  formatWhen,
  timeframeLabel,
} from "@/lib/market/labels";
import { sampleTitle } from "@/lib/market/sample-copy";
import {
  TIMEFRAME_GROUPS,
  type HorizonOutcome,
  type StoredAnalysis,
  type Timeframe,
} from "@/lib/market/types";
import { cn } from "@/lib/utils";

type Props = {
  analysis: StoredAnalysis;
  onBack: () => void;
  watched?: boolean;
  onToggleWatch?: () => void;
  /** Reanalisa o mesmo par em outro tempo gráfico. */
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
  const { snapshot, precedent, vision, onchain } = analysis;
  const [horizonIdx, setHorizonIdx] = useState(
    Math.min(1, Math.max(0, precedent.horizons.length - 1)),
  );
  const horizon = precedent.horizons[horizonIdx] ?? precedent.horizons[0]!;
  const up = snapshot.changePct >= 0;
  const sampleVariant =
    precedent.sampleNote === "ok"
      ? "up"
      : precedent.sampleNote === "small"
        ? "warn"
        : "down";

  const fp = precedent.fingerprint;

  return (
    <article
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-col gap-4 pb-24",
        reanalyzing && "pointer-events-none opacity-70",
      )}
      data-testid="analysis-result"
    >
      <header className="space-y-4 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Voltar"
            className="-ml-1 shrink-0"
            disabled={reanalyzing}
          >
            <ArrowLeft className="size-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <p className="text-xs tracking-wide text-muted uppercase">
              {analysis.source} · {timeframeLabel(analysis.timeframe)} ·{" "}
              {formatInt(analysis.candleCount)} candles
              {onchain?.sources?.length ? ` · ${onchain.sources.join(" + ")}` : ""}
              {reanalyzing ? " · reanalisando…" : ""}
            </p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-display text-2xl leading-tight tracking-tight text-fg sm:text-3xl">
                {analysis.displayTicker}
              </h1>
              <span className="font-mono text-xl tabular-nums text-fg sm:text-2xl">
                {formatPrice(snapshot.last.c)}
              </span>
              <span
                className={cn(
                  "font-mono text-sm tabular-nums",
                  up ? "text-up" : "text-down",
                )}
              >
                {formatPct(snapshot.changePct)} vela
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
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
        </div>

        {onChangeTimeframe ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] tracking-wide text-subtle uppercase">
                Momento gráfico · mesmo par
              </p>
              {reanalyzing ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                  <Loader2 className="size-3 animate-spin" />
                  Atualizando OHLC…
                </span>
              ) : null}
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Reanalisar em outro tempo gráfico"
            >
              {TIMEFRAME_GROUPS.map((group) => (
                <div key={group.key} className="flex flex-1 flex-col gap-1">
                  <span className="text-[9px] tracking-wide text-subtle uppercase">
                    {group.label}
                  </span>
                  <div className="flex flex-1 gap-1 rounded-lg bg-bg p-1 shadow-[var(--shadow-border)]">
                    {group.tfs.map((tf) => {
                      const active = tf === analysis.timeframe;
                      return (
                        <button
                          key={tf}
                          type="button"
                          disabled={reanalyzing}
                          onClick={() => {
                            if (tf === analysis.timeframe || reanalyzing) return;
                            onChangeTimeframe(tf);
                          }}
                          title={`Reanalisar ${analysis.displayTicker} em ${timeframeLabel(tf)}`}
                          className={cn(
                            "h-9 flex-1 rounded-md text-xs font-medium tabular-nums transition-colors",
                            active
                              ? "bg-surface text-fg shadow-[var(--shadow-border)]"
                              : "text-muted hover:text-fg",
                            reanalyzing && "opacity-60",
                          )}
                        >
                          {tf}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-subtle">
              Trocar o TF busca candles novos e recalcula precedentes — não é só filtro visual.
              Horizontes 5/10/20 barras passam a valer neste momento.
            </p>
            {reanalyzeError ? (
              <p className="rounded-md bg-down/10 px-3 py-2 text-sm text-down">{reanalyzeError}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {precedent.horizons.map((h, i) => (
            <HorizonChip
              key={h.bars}
              horizon={h}
              active={i === horizonIdx}
              onClick={() => setHorizonIdx(i)}
            />
          ))}
          <Chip
            label="Amostra"
            primary={sampleTitle(precedent.sampleNote)}
            secondary={`n=${formatInt(precedent.matches)}`}
            variant={sampleVariant}
          />
          <Chip
            label="RSI 14"
            primary={snapshot.rsi14.toFixed(1).replace(".", ",")}
          />
          <Chip
            label="vs SMA20"
            primary={formatPct(snapshot.distSma20Pct)}
            tone={snapshot.distSma20Pct >= 0 ? "up" : "down"}
          />
          <Chip
            label="vs SMA50"
            primary={formatPct(snapshot.distSma50Pct)}
            tone={snapshot.distSma50Pct >= 0 ? "up" : "down"}
          />
          {(snapshot.near20High || snapshot.near20Low) && (
            <Chip
              label="Extremo 20"
              primary={snapshot.near20High ? "high20" : "low20"}
              variant="warn"
            />
          )}
          {onchain?.fundingRate != null ? (
            <Chip
              label="Funding"
              primary={`${onchain.fundingRate >= 0 ? "+" : ""}${(onchain.fundingRate * 100).toFixed(3).replace(".", ",")}%`}
              variant={Math.abs(onchain.fundingRate) >= 0.0005 ? "warn" : undefined}
            />
          ) : null}
          {onchain?.liquidityUsd != null ? (
            <Chip
              label="Liq DEX"
              primary={
                onchain.liquidityUsd >= 1e9
                  ? `$${(onchain.liquidityUsd / 1e9).toFixed(1)}B`
                  : onchain.liquidityUsd >= 1e6
                    ? `$${(onchain.liquidityUsd / 1e6).toFixed(1)}M`
                    : `$${(onchain.liquidityUsd / 1e3).toFixed(0)}K`
              }
            />
          ) : null}
        </div>

        <p className="text-xs leading-relaxed text-muted sm:text-sm">
          {precedent.fingerprintLabel}
          {snapshot.lastExtrema
            ? ` · Último ${snapshot.lastExtrema.type === "top" ? "topo" : "fundo"} há ${snapshot.lastExtrema.barsAgo} barras.`
            : null}
        </p>
      </header>

      <SampleBanner sampleNote={precedent.sampleNote} matches={precedent.matches} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start">
        <div className="space-y-4">
          <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-xs tracking-wide text-muted uppercase">
                Série recente · OHLC + SMAs
              </h2>
              <span className="text-[11px] text-subtle">sem setas de entrada</span>
            </div>
            <OhlcChart data={analysis.chart} matches={precedent.chartMatches} />
          </section>

          <OnchainPanel onchain={onchain} />

          <ScenarioPanel analysis={analysis} />

          <section className="space-y-4 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xs tracking-wide text-muted uppercase">
                  O que o preço fez depois
                </h2>
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

            <div className="grid gap-3 sm:grid-cols-3">
              {precedent.horizons.map((h, i) => (
                <HorizonCard
                  key={h.bars}
                  horizon={h}
                  timeframe={analysis.timeframe}
                  active={i === horizonIdx}
                  onClick={() => setHorizonIdx(i)}
                />
              ))}
            </div>

            <SplitBar horizon={horizon} />

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="mediana" value={formatPct(horizon.medianPct)} />
              <Stat label="média" value={formatPct(horizon.meanPct)} />
              <Stat label="P10" value={formatPct(horizon.p10)} />
              <Stat label="P90" value={formatPct(horizon.p90)} />
            </dl>

            <PathChart horizon={horizon} />
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
              <h2 className="text-xs tracking-wide text-muted uppercase">Fingerprint</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <FpRow label="RSI" value={fp.rsiBucket.replace("-", "–")} />
                <FpRow label="Direção" value={fp.direction === "up" ? "alta" : "baixa"} />
                <FpRow label="vs SMA20" value={sideLabel(fp.vsSma20)} />
                <FpRow label="vs SMA50" value={sideLabel(fp.vsSma50)} />
                <FpRow label="Extremo" value={fp.extreme} />
              </dl>
            </section>
            <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
              <h2 className="text-xs tracking-wide text-muted uppercase">Snapshot</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <FpRow label="RSI 14" value={snapshot.rsi14.toFixed(1).replace(".", ",")} />
                <FpRow label="SMA20" value={formatPrice(snapshot.sma20)} />
                <FpRow label="SMA50" value={formatPrice(snapshot.sma50)} />
                <FpRow
                  label="SMA200"
                  value={snapshot.sma200 != null ? formatPrice(snapshot.sma200) : "—"}
                />
                <FpRow
                  label="Sequência"
                  value={
                    snapshot.consecutive === 0
                      ? "—"
                      : `${Math.abs(snapshot.consecutive)}× ${snapshot.consecutive > 0 ? "alta" : "baixa"}`
                  }
                />
              </dl>
            </section>
          </div>

          {precedent.recentMatches.length > 0 ? (
            <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-xs tracking-wide text-muted uppercase">
                  Matches recentes · tape
                </h2>
              </div>
              <ul className="divide-y divide-border">
                {precedent.recentMatches.map((m) => {
                  const pos = m.forward >= 0;
                  return (
                    <li
                      key={m.t}
                      className="flex items-center justify-between gap-3 px-4 py-2.5"
                    >
                      <span className="text-sm text-muted">{formatWhen(m.t)}</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-mono text-sm tabular-nums",
                          pos ? "text-up" : "text-down",
                        )}
                      >
                        {pos ? (
                          <TrendingUp className="size-3.5" />
                        ) : (
                          <TrendingDown className="size-3.5" />
                        )}
                        {formatPct(m.forward)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {analysis.thumb || vision || analysis.visionError ? (
            <section
              className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]"
              data-testid="vision-section"
            >
              {analysis.thumb ? (
                <img
                  src={analysis.thumb}
                  alt="Print enviado"
                  className="chart-print h-36 w-full object-cover object-top"
                  data-testid="vision-thumb"
                />
              ) : null}
              <div className="space-y-3 p-4">
                <div className="flex items-center gap-2 text-xs tracking-wide text-muted uppercase">
                  <Eye className="size-3.5" />
                  Leitura visual
                  <span className="text-subtle">apoio qualitativo</span>
                </div>
                {vision ? (
                  <div data-testid="vision-reading">
                    <p className="text-sm leading-relaxed text-fg">{vision.leitura}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant="accent">tendência {vision.tendencia}</Badge>
                      {vision.padrao ? <Badge>{vision.padrao}</Badge> : null}
                      <Badge>confiança {vision.confianca}</Badge>
                    </div>
                    {vision.suporteResistencia ? (
                      <p className="mt-2 text-xs text-muted">{vision.suporteResistencia}</p>
                    ) : null}
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
        </div>

        <RiskRail snapshot={snapshot} precedent={precedent} horizon={horizon} />
      </div>

      <p className="text-xs leading-relaxed text-subtle">
        Frequência, caminho e encenação são contexto — nunca ordem de compra ou venda.
        O passado não garante o próximo movimento. O que você faz com os números é só seu.
        Use <span className="text-fg">Ler o cenário</span> para o texto corrido.
      </p>
    </article>
  );
}

function HorizonChip({
  horizon,
  active,
  onClick,
}: {
  horizon: HorizonOutcome;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-[5.5rem] rounded-lg px-2.5 py-2 text-left shadow-[var(--shadow-border)] transition-colors",
        active ? "bg-bg-elevated ring-1 ring-border" : "bg-bg hover:bg-bg-elevated/80",
      )}
    >
      <p className="text-[10px] tracking-wide text-subtle uppercase">H{horizon.bars}</p>
      <p className="mt-0.5 font-mono text-xs tabular-nums">
        <span className="text-up">{Math.round(horizon.upPct)}%</span>
        <span className="text-subtle"> / </span>
        <span className="text-muted">{Math.round(horizon.flatPct)}%</span>
        <span className="text-subtle"> / </span>
        <span className="text-down">{Math.round(horizon.downPct)}%</span>
      </p>
    </button>
  );
}

function HorizonCard({
  horizon,
  timeframe,
  active,
  onClick,
}: {
  horizon: HorizonOutcome;
  timeframe: Timeframe;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg bg-bg p-3 text-left shadow-[var(--shadow-border)] transition-colors",
        active && "ring-1 ring-border",
      )}
    >
      <p className="text-xs text-muted">
        {horizon.bars} barras (≈{barsToHuman(timeframe, horizon.bars)}) · n={horizon.samples}
      </p>
      <p className="mt-2 font-mono text-xs tabular-nums">
        <span className="text-up">↑ {Math.round(horizon.upPct)}%</span>
        <span className="mx-1 text-subtle">·</span>
        <span className="text-muted">→ {Math.round(horizon.flatPct)}%</span>
        <span className="mx-1 text-subtle">·</span>
        <span className="text-down">↓ {Math.round(horizon.downPct)}%</span>
      </p>
      <p className="mt-2 font-mono text-sm tabular-nums text-fg">
        med {formatPct(horizon.medianPct)}
      </p>
      <p className="mt-1 font-mono text-xs tabular-nums text-down">
        DD med {formatPct(horizon.medianDrawdownPct)}
      </p>
      <p className="mt-1 text-[11px] text-subtle">
        {baselineDeltaLabel(horizon.upPct, horizon.baseline.upPct)}
      </p>
    </button>
  );
}

function Chip({
  label,
  primary,
  secondary,
  variant,
  tone,
}: {
  label: string;
  primary: string;
  secondary?: string;
  variant?: "up" | "down" | "warn" | "accent";
  tone?: "up" | "down";
}) {
  return (
    <div className="rounded-lg bg-bg px-2.5 py-2 shadow-[var(--shadow-border)]">
      <p className="text-[10px] tracking-wide text-subtle uppercase">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-sm",
          variant === "up" && "text-up",
          variant === "down" && "text-down",
          variant === "warn" && "text-warn",
          variant === "accent" && "text-accent",
          tone === "up" && "font-mono tabular-nums text-up",
          tone === "down" && "font-mono tabular-nums text-down",
          !variant && !tone && "font-mono tabular-nums text-fg",
          variant && !tone && "font-medium",
        )}
      >
        {primary}
        {secondary ? <span className="ml-1 text-xs font-normal text-muted">{secondary}</span> : null}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-mono text-sm tabular-nums text-fg">{value}</p>
    </div>
  );
}

function FpRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-mono text-sm tabular-nums text-fg">{value}</dd>
    </div>
  );
}

function sideLabel(side: "above" | "below" | "near"): string {
  if (side === "above") return "acima";
  if (side === "below") return "abaixo";
  return "junto";
}
