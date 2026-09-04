import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { productBoundary, sampleBody, sampleTitle } from "@/lib/market/sample-copy";
import type { PrecedentResult } from "@/lib/market/types";
import { cn } from "@/lib/utils";

type Props = {
  sampleNote: PrecedentResult["sampleNote"];
  matches: number;
  className?: string;
};

/**
 * Banner no topo do resultado — a primeira coisa que o olho lê.
 * `tiny` precisa ser impossível de ignorar: é o caso em que os números
 * abaixo são ilustração, não estatística — um ring fino do mesmo peso
 * visual de "amostra razoável" deixa isso passar batido.
 */
export function SampleBanner({ sampleNote, matches, className }: Props) {
  const weak = sampleNote !== "ok";
  const tiny = sampleNote === "tiny";
  const Icon = sampleNote === "tiny" ? AlertTriangle : sampleNote === "small" ? Info : CheckCircle2;

  return (
    <div
      className={cn(
        "rounded-xl px-4 py-3 shadow-[var(--shadow-border)]",
        tiny && "bg-down/15 ring-2 ring-down/50",
        sampleNote === "small" && "bg-warn/10 ring-1 ring-warn/30",
        sampleNote === "ok" && "bg-up/10 ring-1 ring-up/25",
        className,
      )}
      role="status"
    >
      <div className="flex gap-3">
        <Icon
          className={cn(
            "mt-0.5 shrink-0",
            tiny ? "size-5" : "size-4",
            sampleNote === "tiny" && "text-down",
            sampleNote === "small" && "text-warn",
            sampleNote === "ok" && "text-up",
          )}
        />
        <div className="min-w-0 space-y-1">
          {tiny ? (
            <p className="text-[11px] font-semibold tracking-wide text-down uppercase">
              Leia antes de confiar nos números
            </p>
          ) : null}
          <p
            className={cn(
              "font-medium",
              tiny ? "text-base" : "text-sm",
              sampleNote === "tiny" && "text-down",
              sampleNote === "small" && "text-warn",
              sampleNote === "ok" && "text-up",
            )}
          >
            {sampleTitle(sampleNote)}
            {weak ? (
              <span className="ml-2 font-mono text-xs font-normal uppercase opacity-80">
                {sampleNote}
              </span>
            ) : null}
          </p>
          <p className={cn("leading-relaxed text-fg", tiny ? "text-sm font-medium" : "text-sm")}>
            {sampleBody(sampleNote, matches)}
          </p>
          <p className="text-xs leading-relaxed text-muted">{productBoundary()}</p>
        </div>
      </div>
    </div>
  );
}
