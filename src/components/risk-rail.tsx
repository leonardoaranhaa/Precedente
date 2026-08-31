import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPct } from "@/lib/market/labels";
import type { HorizonOutcome, PrecedentResult, Snapshot } from "@/lib/market/types";
import { cn } from "@/lib/utils";

type Props = {
  snapshot: Snapshot;
  precedent: PrecedentResult;
  horizon: HorizonOutcome;
  className?: string;
};

const LEV_OPTIONS = [1, 2, 3, 5] as const;

export function RiskRail({ snapshot, precedent, horizon, className }: Props) {
  const [lev, setLev] = useState<(typeof LEV_OPTIONS)[number]>(1);

  const checklist = useMemo(() => {
    return [
      {
        id: "sample",
        on: precedent.sampleNote !== "ok",
        label:
          precedent.sampleNote === "tiny"
            ? "Amostra muito pequena (tiny)"
            : precedent.sampleNote === "small"
              ? "Amostra pequena (< 20 matches)"
              : "Amostra adequada",
        risk: precedent.sampleNote !== "ok",
      },
      {
        id: "relaxed",
        on: precedent.relaxed.length > 0,
        label:
          precedent.relaxed.length > 0
            ? `Match relaxado: ${precedent.relaxed.join(", ")}`
            : "Match com critérios completos",
        risk: precedent.relaxed.length > 0,
      },
      {
        id: "dd",
        on: Math.abs(horizon.medianDrawdownPct) > 3,
        label: `DD mediano do caminho ${formatPct(horizon.medianDrawdownPct)}`,
        risk: Math.abs(horizon.medianDrawdownPct) > 3,
      },
      {
        id: "high20",
        on: snapshot.near20High,
        label: snapshot.near20High ? "Colado na máxima de 20 barras" : "Longe da máxima 20",
        risk: snapshot.near20High,
      },
      {
        id: "low20",
        on: snapshot.near20Low,
        label: snapshot.near20Low ? "Colado na mínima de 20 barras" : "Longe da mínima 20",
        risk: snapshot.near20Low,
      },
    ];
  }, [horizon.medianDrawdownPct, precedent.relaxed, precedent.sampleNote, snapshot.near20High, snapshot.near20Low]);

  const riskCount = checklist.filter((c) => c.risk).length;
  const sampleVariant =
    precedent.sampleNote === "ok" ? "up" : precedent.sampleNote === "small" ? "warn" : "down";

  const worstAbs = Math.abs(horizon.worstDrawdownPct);
  const stressMove = lev <= 1 ? worstAbs : worstAbs / lev;

  const reading = buildReading({
    sampleNote: precedent.sampleNote,
    relaxed: precedent.relaxed.length > 0,
    medianDd: horizon.medianDrawdownPct,
    worstDd: horizon.worstDrawdownPct,
    riskCount,
  });

  return (
    <aside
      className={cn(
        "flex flex-col gap-5 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] lg:sticky lg:top-4",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-4 text-warn" />
        <h2 className="text-xs tracking-wide text-muted uppercase">Prevenção de perdas</h2>
      </div>

      <section className="space-y-2">
        <p className="text-xs text-muted">Qualidade da amostra</p>
        <div className="flex items-center justify-between gap-2">
          <Badge variant={sampleVariant} className="uppercase">
            {precedent.sampleNote}
          </Badge>
          <span className="font-mono text-sm tabular-nums text-fg">
            {precedent.matches} matches
          </span>
        </div>
        <SampleBar note={precedent.sampleNote} matches={precedent.matches} />
        {precedent.relaxed.length > 0 ? (
          <p className="text-xs leading-relaxed text-warn">
            Critérios relaxados: {precedent.relaxed.join(", ")}.
          </p>
        ) : (
          <p className="text-xs text-subtle">Match com fingerprint completo.</p>
        )}
      </section>

      <section className="space-y-2">
        <p className="text-xs text-muted">Risco do caminho · {horizon.bars} barras</p>
        <dl className="space-y-2">
          <RiskRow label="Drawdown mediano" value={formatPct(horizon.medianDrawdownPct)} tone="down" />
          <RiskRow label="Pior drawdown" value={formatPct(horizon.worstDrawdownPct)} tone="down" />
          <RiskRow label="Runup mediano" value={formatPct(horizon.medianRunupPct)} tone="up" />
        </dl>
        <p className="text-xs leading-relaxed text-subtle">
          Retorno final ≠ sobrevivência no caminho. Quem se expõe agressivo é pressionado pelo
          drawdown do trajeto, não só pelo ponto de chegada.
        </p>
      </section>

      <section className="space-y-2">
        <p className="text-xs text-muted">Simulação educativa (opcional)</p>
        <div className="flex gap-1 rounded-md bg-bg p-1">
          {LEV_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setLev(n)}
              className={cn(
                "h-8 flex-1 rounded-sm text-xs font-medium tabular-nums",
                lev === n
                  ? "bg-surface text-fg shadow-[var(--shadow-border)]"
                  : "text-muted hover:text-fg",
              )}
            >
              {n}x
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted">
          Se o <span className="text-fg">pior caminho</span> se repetir, a ordem de grandeza do
          movimento contrário é ~{" "}
          <span className="font-mono tabular-nums text-down">{formatPct(-worstAbs)}</span>
          {lev > 1 ? (
            <>
              {" "}
              (~{" "}
              <span className="font-mono tabular-nums text-warn">{formatPct(-stressMove)}</span> já
              estressa {lev}x).
            </>
          ) : (
            "."
          )}
        </p>
        <p className="text-[11px] leading-relaxed text-subtle">
          Não é ordem de corretora nem recomendação. Só ilustra fragilidade do caminho.
        </p>
      </section>

      <section className="space-y-2">
        <p className="text-xs text-muted">Checklist</p>
        <ul className="space-y-1.5">
          {checklist.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-xs leading-snug">
              <span
                className={cn(
                  "mt-0.5 inline-flex size-3.5 shrink-0 items-center justify-center rounded-sm text-[10px]",
                  item.risk
                    ? "bg-warn/20 text-warn"
                    : "bg-up/15 text-up",
                )}
                aria-hidden
              >
                {item.risk ? "!" : "✓"}
              </span>
              <span className={item.risk ? "text-fg" : "text-muted"}>{item.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 border-t border-border pt-4">
        <p className="text-xs text-muted">Leitura objetiva</p>
        <p className="text-sm leading-relaxed text-fg">{reading}</p>
        <p className="text-[11px] tracking-wide text-subtle uppercase">
          Nunca: compre · venda · entre · long · short
        </p>
      </section>
    </aside>
  );
}

function SampleBar({ note, matches }: { note: "ok" | "small" | "tiny"; matches: number }) {
  const pct = note === "ok" ? Math.min(100, 40 + matches) : note === "small" ? 35 : 15;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-bg">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          note === "ok" && "bg-up",
          note === "small" && "bg-warn",
          note === "tiny" && "bg-down",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function RiskRow({
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

function buildReading(input: {
  sampleNote: "ok" | "small" | "tiny";
  relaxed: boolean;
  medianDd: number;
  worstDd: number;
  riskCount: number;
}): string {
  const parts: string[] = [];
  if (input.sampleNote === "tiny") {
    parts.push("Amostra insuficiente para confiar na distribuição do caminho.");
  } else if (input.sampleNote === "small") {
    parts.push("Amostra limitada — interprete os horizontes com cautela.");
  } else {
    parts.push("Amostra razoável para leitura descritiva dos precedentes.");
  }
  if (input.relaxed) {
    parts.push("O match só fechou com critérios relaxados.");
  }
  if (Math.abs(input.medianDd) > 3) {
    parts.push(
      `Caminho histórico com drawdown mediano de ${formatPct(input.medianDd)} antes do fim do horizonte.`,
    );
  }
  if (Math.abs(input.worstDd) > 8) {
    parts.push(`Pior trajetória registrada chegou a ${formatPct(input.worstDd)}.`);
  }
  if (input.riskCount >= 3) {
    parts.push("Vários alertas de fragilidade ativos ao mesmo tempo.");
  }
  parts.push("Isto descreve o passado parecido — não ordena exposição.");
  return parts.join(" ");
}
