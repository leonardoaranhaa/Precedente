import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "ohlc", label: "OHLC real na Binance" },
  { id: "stats", label: "RSI, médias, precedentes" },
  { id: "vision", label: "Leitura visual do print" },
] as const;

export type PipelineStep = (typeof STEPS)[number]["id"] | "done";

export function Pipeline({
  step,
  hasImage,
}: {
  step: PipelineStep;
  hasImage: boolean;
}) {
  const visible = hasImage ? STEPS : STEPS.filter((s) => s.id !== "vision");
  const order = visible.map((s) => s.id);
  const currentIdx =
    step === "done" ? order.length : Math.max(0, order.indexOf(step as "ohlc"));

  return (
    <ol className="space-y-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      {visible.map((s, i) => {
        const done = i < currentIdx || step === "done";
        const active = i === currentIdx && step !== "done";
        return (
          <li key={s.id} className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-sm shadow-[var(--shadow-border)]",
                done && "bg-accent text-accent-fg",
                active && "bg-bg text-accent",
                !done && !active && "bg-bg text-subtle",
              )}
            >
              {done ? (
                <Check className="size-4" />
              ) : active ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <span className="font-mono text-xs">{i + 1}</span>
              )}
            </span>
            <span className={cn("text-sm", active ? "text-fg" : "text-muted")}>
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
