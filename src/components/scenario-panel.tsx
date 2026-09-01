import { useMemo, useState } from "react";
import { Theater } from "lucide-react";
import {
  runScenario,
  SCENARIO_KEYS,
  type ScenarioKey,
} from "@/lib/market/scenario";
import { formatPct } from "@/lib/market/labels";
import type { StoredAnalysis } from "@/lib/market/types";
import { cn } from "@/lib/utils";

type Props = { analysis: StoredAnalysis };

function formatUsd(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}US$ ${Math.abs(n).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Encenação hipotética em USD — nunca ordem de exposição.
 */
export function ScenarioPanel({ analysis }: Props) {
  const defaultBars =
    analysis.precedent.horizons.find((h) => h.bars === 10)?.bars ??
    analysis.precedent.horizons[0]?.bars ??
    10;

  const [usdText, setUsdText] = useState("1000");
  const [leverage, setLeverage] = useState(1);
  const [bars, setBars] = useState(defaultBars);
  const [key, setKey] = useState<ScenarioKey>("typical_path");

  const usd = Number(String(usdText).replace(",", "."));

  const result = useMemo(
    () =>
      runScenario(analysis, {
        usd: Number.isFinite(usd) ? usd : 0,
        leverage,
        horizonBars: bars,
        key,
      }),
    [analysis, usd, leverage, bars, key],
  );

  return (
    <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
      <div className="flex items-start gap-2 border-b border-border px-4 py-3">
        <Theater className="mt-0.5 size-3.5 shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xs tracking-wide text-muted uppercase">Encenar cenário</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-subtle">
            Hipótese em USD sobre o caminho ou o desfecho nos precedentes — não diz o que fazer.
            Positivo ou negativo, a decisão continua sendo só sua.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-[10px] tracking-wide text-subtle uppercase">US$ (hipótese)</span>
            <input
              type="text"
              inputMode="decimal"
              value={usdText}
              onChange={(e) => setUsdText(e.target.value)}
              className="h-9 w-full rounded-md bg-bg px-3 font-mono text-sm text-fg shadow-[var(--shadow-border)] focus:outline-none"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] tracking-wide text-subtle uppercase">
              Mult. educativo
            </span>
            <div className="flex gap-1 rounded-md bg-bg p-1 shadow-[var(--shadow-border)]">
              {[1, 2, 3, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLeverage(n)}
                  className={cn(
                    "h-7 flex-1 rounded-sm text-xs font-medium",
                    leverage === n ? "bg-surface text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {n}×
                </button>
              ))}
            </div>
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] tracking-wide text-subtle uppercase">Horizonte</span>
            <div className="flex gap-1 rounded-md bg-bg p-1 shadow-[var(--shadow-border)]">
              {analysis.precedent.horizons.map((h) => (
                <button
                  key={h.bars}
                  type="button"
                  onClick={() => setBars(h.bars)}
                  className={cn(
                    "h-7 flex-1 rounded-sm text-xs font-medium tabular-nums",
                    bars === h.bars ? "bg-surface text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {h.bars}b
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SCENARIO_KEYS.map((k) => (
            <button
              key={k.id}
              type="button"
              title={k.hint}
              onClick={() => setKey(k.id)}
              className={cn(
                "h-8 rounded-full px-3 text-[11px] font-medium",
                key === k.id
                  ? "bg-accent text-accent-fg"
                  : "bg-bg text-muted hover:text-fg",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>

        {result ? (
          <div className="space-y-3 rounded-lg bg-bg/70 p-3 ring-1 ring-border">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs text-muted">{result.keyLabel}</p>
              <p
                className={cn(
                  "font-mono text-lg tabular-nums",
                  result.pnlUsd > 0 && "text-up",
                  result.pnlUsd < 0 && "text-down",
                  result.pnlUsd === 0 && "text-fg",
                )}
              >
                {formatUsd(result.pnlUsd)}
              </p>
            </div>
            <p className="font-mono text-xs tabular-nums text-muted">
              movimento {formatPct(result.movePct)} · notional{" "}
              {formatUsd(result.notional).replace(/^[+−]/, "")}
            </p>
            <p className="text-[11px] leading-relaxed text-subtle">{result.timeNote}</p>
            {result.sampleWarning ? (
              <p className="text-[11px] leading-relaxed text-warn">{result.sampleWarning}</p>
            ) : null}
            <ul className="space-y-2 text-sm leading-relaxed text-fg">
              {result.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-subtle">
              {result.disclaimer}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">Informe um valor em US$ maior que zero.</p>
        )}
      </div>
    </section>
  );
}
