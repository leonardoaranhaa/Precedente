import { useState } from "react";
import {
  ArrowLeft,
  Eye,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OhlcChart } from "@/components/ohlc-chart";
import { PathChart } from "@/components/path-chart";
import { SplitBar } from "@/components/split-bar";
import {
  formatInt,
  formatPct,
  formatPrice,
  formatWhen,
  timeframeLabel,
} from "@/lib/market/labels";
import type { StoredAnalysis } from "@/lib/market/types";
import { cn } from "@/lib/utils";

type Props = {
  analysis: StoredAnalysis;
  onBack: () => void;
};

export function AnalysisResult({ analysis, onBack }: Props) {
  const { snapshot, precedent, vision } = analysis;
  const [horizonIdx, setHorizonIdx] = useState(1);
  const horizon = precedent.horizons[horizonIdx] ?? precedent.horizons[0]!;
  const up = snapshot.changePct >= 0;

  return (
    <article className="mx-auto flex w-full max-w-lg flex-col gap-6 pb-16 lg:max-w-none">
      <header className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Nova análise"
          className="-ml-2"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-wide text-muted uppercase">
            {analysis.source} · {timeframeLabel(analysis.timeframe)}
          </p>
          <h1 className="font-display text-3xl leading-tight tracking-tight text-fg">
            {analysis.displayTicker}
          </h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg tabular-nums text-fg">
            {formatPrice(snapshot.last.c)}
          </p>
          <p
            className={cn(
              "font-mono text-xs tabular-nums",
              up ? "text-up" : "text-down",
            )}
          >
            {formatPct(snapshot.changePct)}
          </p>
        </div>
      </header>

      {analysis.thumb || vision ? (
        <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
          {analysis.thumb ? (
            <img
              src={analysis.thumb}
              alt="Print enviado"
              className="chart-print h-36 w-full object-cover object-top"
            />
          ) : null}
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-xs tracking-wide text-muted uppercase">
              <Eye className="size-3.5" />
              Leitura visual
              <span className="text-subtle">apoio qualitativo</span>
            </div>
            {vision ? (
              <>
                <p className="text-sm leading-relaxed text-fg">{vision.leitura}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="accent">tendência {vision.tendencia}</Badge>
                  {vision.padrao ? <Badge>{vision.padrao}</Badge> : null}
                  <Badge>confiança {vision.confianca}</Badge>
                </div>
                {vision.suporteResistencia ? (
                  <p className="text-xs text-muted">{vision.suporteResistencia}</p>
                ) : null}
              </>
            ) : analysis.visionError ? (
              <p className="text-sm text-muted">{analysis.visionError}</p>
            ) : (
              <p className="text-sm text-muted">Nenhum print nesta análise.</p>
            )}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-xs tracking-wide text-muted uppercase">
              Condição atual · dado real
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="RSI 14" value={snapshot.rsi14.toFixed(1).replace(".", ",")} />
              <Metric
                label="vs SMA20"
                value={formatPct(snapshot.distSma20Pct)}
                tone={snapshot.distSma20Pct >= 0 ? "up" : "down"}
              />
              <Metric
                label="vs SMA50"
                value={formatPct(snapshot.distSma50Pct)}
                tone={snapshot.distSma50Pct >= 0 ? "up" : "down"}
              />
              <Metric
                label="SMA200"
                value={
                  snapshot.sma200 != null ? formatPrice(snapshot.sma200) : "—"
                }
              />
            </div>
            <p className="text-sm leading-relaxed text-muted">
              {precedent.fingerprintLabel}.
              {snapshot.lastExtrema
                ? ` Último ${snapshot.lastExtrema.type === "top" ? "topo" : "fundo"} há ${snapshot.lastExtrema.barsAgo} barras.`
                : null}
            </p>
          </section>

          <section className="space-y-4 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <div>
              <p className="text-xs tracking-wide text-muted uppercase">
                Precedente histórico
              </p>
              <p className="mt-2 font-display text-5xl leading-none tracking-tight text-fg tabular-nums">
                {formatInt(precedent.matches)}
              </p>
              <p className="mt-2 text-sm text-muted">
                vezes em {formatInt(analysis.candleCount)} candles desta série.
                {precedent.relaxed.length > 0
                  ? ` Filtros relaxados: ${precedent.relaxed.join(", ")}.`
                  : null}
              </p>
              {precedent.sampleNote !== "ok" ? (
                <p className="mt-2 flex items-start gap-2 text-xs text-warn">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  {precedent.sampleNote === "tiny"
                    ? "Amostra muito pequena — trate como ilustração, não como base."
                    : "Amostra pequena — interprete com cautela."}
                </p>
              ) : null}
            </div>

            <Separator />

            <div className="flex gap-1 rounded-md bg-bg p-1">
              {precedent.horizons.map((h, i) => (
                <button
                  key={h.bars}
                  type="button"
                  onClick={() => setHorizonIdx(i)}
                  className={cn(
                    "h-10 flex-1 rounded-sm text-xs font-medium transition-colors duration-150",
                    i === horizonIdx
                      ? "bg-surface text-fg shadow-[var(--shadow-border)]"
                      : "text-muted hover:text-fg",
                  )}
                >
                  {h.bars} barras
                </button>
              ))}
            </div>

            <p className="text-sm text-fg">
              O que aconteceu depois · {horizon.label}
            </p>
            <SplitBar horizon={horizon} />

            <dl className="grid grid-cols-2 gap-3 pt-1">
              <Row label="mediana" value={formatPct(horizon.medianPct)} />
              <Row label="média" value={formatPct(horizon.meanPct)} />
              <Row label="10% pior que (P10)" value={formatPct(horizon.p10)} />
              <Row label="10% melhor que (P90)" value={formatPct(horizon.p90)} />
            </dl>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm text-fg">O caminho até lá</p>
              <dl className="grid grid-cols-2 gap-3">
                <Row
                  label="queda típica no caminho"
                  value={formatPct(horizon.medianDrawdownPct)}
                  tone="down"
                />
                <Row
                  label="alta típica no caminho"
                  value={formatPct(horizon.medianRunupPct)}
                  tone="up"
                />
                <Row
                  label="pior queda registrada"
                  value={formatPct(horizon.worstDrawdownPct)}
                  tone="down"
                />
              </dl>
              <p className="text-xs leading-relaxed text-subtle">
                O retorno acima é só o ponto final. Quem opera alavancado é
                liquidado pelo caminho, não pelo fim dele.
              </p>
            </div>

            <PathChart horizon={horizon} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="space-y-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <h2 className="text-xs tracking-wide text-muted uppercase">
              Série recente
            </h2>
            <OhlcChart data={analysis.chart} />
          </section>

          {precedent.recentMatches.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xs tracking-wide text-muted uppercase">
                Ocorrências recentes
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
                {precedent.recentMatches.map((m) => {
                  const pos = m.forward >= 0;
                  return (
                    <li
                      key={m.t}
                      className="flex items-center justify-between gap-3 px-4 py-3"
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
        </div>
      </div>

      <p className="text-xs leading-relaxed text-subtle">
        Frequência e contexto, nunca ordem de compra ou venda. O passado não
        garante o próximo movimento. A leitura do print é qualitativa; o que
        conta para a estatística é o OHLC da {analysis.source}.
      </p>
    </article>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="rounded-lg bg-surface px-3 py-3 shadow-[var(--shadow-border)]">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-base tabular-nums",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
          !tone && "text-fg",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={cn(
          "font-mono text-sm tabular-nums",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
          !tone && "text-fg",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
