import { useEffect, useMemo, useState } from "react";
import { Theater } from "lucide-react";
import {
  runScenario,
  SCENARIO_KEYS,
  type ScenarioKey,
} from "@/lib/market/scenario";
import { formatPct, timeframeLabel } from "@/lib/market/labels";
import { loadHistory } from "@/lib/history";
import type { StoredAnalysis } from "@/lib/market/types";
import { cn } from "@/lib/utils";

type Props = { analysis: StoredAnalysis };

function formatMoney(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function analysisKey(a: StoredAnalysis): string {
  return `${a.ticker}:${a.timeframe}`;
}

/**
 * Encenação hipotética sobre o ativo em foco (ou o escolhido no filtro).
 * Capital é só unidade de conta — o cenário não é “de USD”, é do par tratado.
 */
export function ScenarioPanel({ analysis }: Props) {
  const [catalog, setCatalog] = useState<StoredAnalysis[]>([analysis]);
  const [focusId, setFocusId] = useState(analysisKey(analysis));

  useEffect(() => {
    const hist = loadHistory();
    // Análise atual primeiro; depois histórico (par+TF únicos, mais recente).
    const map = new Map<string, StoredAnalysis>();
    map.set(analysisKey(analysis), analysis);
    for (const h of hist) {
      const k = analysisKey(h);
      if (!map.has(k)) map.set(k, h);
    }
    setCatalog([...map.values()]);
    setFocusId(analysisKey(analysis));
  }, [analysis.id, analysis.ticker, analysis.timeframe]);

  const focus =
    catalog.find((a) => analysisKey(a) === focusId) ?? analysis;

  const defaultBars =
    focus.precedent.horizons.find((h) => h.bars === 10)?.bars ??
    focus.precedent.horizons[0]?.bars ??
    10;

  const [capitalText, setCapitalText] = useState("1000");
  const [leverage, setLeverage] = useState(1);
  const [bars, setBars] = useState(defaultBars);
  const [key, setKey] = useState<ScenarioKey>("typical_path");

  // Ao trocar de ativo/momento, realinha o horizonte padrão.
  useEffect(() => {
    const next =
      focus.precedent.horizons.find((h) => h.bars === 10)?.bars ??
      focus.precedent.horizons[0]?.bars ??
      10;
    setBars(next);
  }, [focus.id]);

  const capital = Number(String(capitalText).replace(",", "."));

  const result = useMemo(
    () =>
      runScenario(focus, {
        capital: Number.isFinite(capital) ? capital : 0,
        leverage,
        horizonBars: bars,
        key,
      }),
    [focus, capital, leverage, bars, key],
  );

  return (
    <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
      <div className="flex items-start gap-2 border-b border-border px-4 py-3">
        <Theater className="mt-0.5 size-3.5 shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xs tracking-wide text-muted uppercase">Encenar cenário</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-subtle">
            Sobre o ativo que você está tratando agora — ou outro par/momento do histórico neste
            aparelho. Capital é só unidade de conta. Não diz o que fazer.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="space-y-1.5">
          <p className="text-[10px] tracking-wide text-subtle uppercase">
            Ativo e momento
          </p>
          <div className="flex flex-wrap gap-1.5">
            {catalog.slice(0, 12).map((a) => {
              const id = analysisKey(a);
              const active = id === focusId;
              const isCurrent = id === analysisKey(analysis);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFocusId(id)}
                  className={cn(
                    "h-8 rounded-full px-3 text-[11px] font-medium",
                    active
                      ? "bg-accent text-accent-fg"
                      : "bg-bg text-muted hover:text-fg",
                  )}
                  title={`${a.displayTicker} · ${timeframeLabel(a.timeframe)}`}
                >
                  {(a.displayTicker.split("/")[0] ?? a.displayTicker)}
                  <span className="opacity-70"> · {a.timeframe}</span>
                  {isCurrent && !active ? (
                    <span className="ml-1 opacity-60">agora</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted">
            Em foco:{" "}
            <span className="font-medium text-fg">{focus.displayTicker}</span>
            {" · "}
            {timeframeLabel(focus.timeframe)}
            {" · n="}
            {focus.precedent.matches}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-[10px] tracking-wide text-subtle uppercase">
              Capital (unidade de conta)
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={capitalText}
              onChange={(e) => setCapitalText(e.target.value)}
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
              {focus.precedent.horizons.map((h) => (
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
              <p className="text-xs text-muted">
                {result.displayTicker} · {result.timeframeLabel} · {result.keyLabel}
              </p>
              <p
                className={cn(
                  "font-mono text-lg tabular-nums",
                  result.pnl > 0 && "text-up",
                  result.pnl < 0 && "text-down",
                  result.pnl === 0 && "text-fg",
                )}
              >
                {formatMoney(result.pnl)}
              </p>
            </div>
            <p className="font-mono text-xs tabular-nums text-muted">
              movimento {formatPct(result.movePct)} · notional{" "}
              {formatMoney(result.notional).replace(/^[+−]/, "")}
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
          <p className="text-sm text-muted">Informe um capital de referência maior que zero.</p>
        )}
      </div>
    </section>
  );
}
