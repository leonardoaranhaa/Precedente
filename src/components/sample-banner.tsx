import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { productBoundary, sampleBody, sampleTitle } from "@/lib/market/sample-copy";
import type { PrecedentResult } from "@/lib/market/types";
import { cn } from "@/lib/utils";

type Props = {
  sampleNote: PrecedentResult["sampleNote"];
  matches: number;
  className?: string;
};

/** Banner no topo do resultado — a primeira coisa que o olho lê. */
export function SampleBanner({ sampleNote, matches, className }: Props) {
  const weak = sampleNote !== "ok";
  const Icon = sampleNote === "tiny" ? AlertTriangle : sampleNote === "small" ? Info : CheckCircle2;

  return (
    <div
      className={cn(
        "rounded-xl px-4 py-3 shadow-[var(--shadow-border)]",
        sampleNote === "tiny" && "bg-down/10 ring-1 ring-down/30",
        sampleNote === "small" && "bg-warn/10 ring-1 ring-warn/30",
        sampleNote === "ok" && "bg-up/10 ring-1 ring-up/25",
        className,
      )}
      role="status"
    >
      <div className="flex gap-3">
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            sampleNote === "tiny" && "text-down",
            sampleNote === "small" && "text-warn",
            sampleNote === "ok" && "text-up",
          )}
        />
        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              "text-sm font-medium",
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
          <p className="text-sm leading-relaxed text-fg">{sampleBody(sampleNote, matches)}</p>
          <p className="text-xs leading-relaxed text-muted">{productBoundary()}</p>
        </div>
      </div>
    </div>
  );
}
