import type { HorizonOutcome } from "@/lib/market/types";
import { cn } from "@/lib/utils";

export function SplitBar({ horizon }: { horizon: HorizonOutcome }) {
  return (
    <div className="space-y-3">
      <div className="flex h-2 overflow-hidden rounded-full bg-bg">
        <div className="bg-up" style={{ width: `${horizon.upPct}%` }} />
        <div className="bg-subtle/60" style={{ width: `${horizon.flatPct}%` }} />
        <div className="bg-down" style={{ width: `${horizon.downPct}%` }} />
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="subiu" value={horizon.upPct} tone="up" />
        <Stat label="lateral" value={horizon.flatPct} tone="muted" />
        <Stat label="caiu" value={horizon.downPct} tone="down" />
      </dl>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "up" | "down" | "muted";
}) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={cn(
          "font-mono text-sm tabular-nums",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
          tone === "muted" && "text-fg",
        )}
      >
        {`${Math.round(value)}%`}
      </dd>
    </div>
  );
}
