import { useMemo } from "react";
import type { HorizonOutcome } from "@/lib/market/types";
import { formatPct } from "@/lib/market/labels";
import { cn } from "@/lib/utils";

export function PathChart({ horizon, className }: { horizon: HorizonOutcome; className?: string }) {
  const layout = useMemo(() => {
    const values = [0, ...horizon.medianPath];
    if (values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max(0.15, (max - min) * 0.18);
    const yMin = min - pad;
    const yMax = max + pad;
    const w = 320;
    const h = 96;
    const x = (i: number) => (i / (values.length - 1)) * w;
    const y = (v: number) => ((yMax - v) / (yMax - yMin)) * h;
    const zeroY = y(0);
    const d = values
      .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");
    const area = `${d} L ${w} ${zeroY.toFixed(1)} L 0 ${zeroY.toFixed(1)} Z`;
    const last = values[values.length - 1]!;
    const up = last >= 0;
    return { w, h, d, area, zeroY, last, up };
  }, [horizon]);

  if (!layout) return null;

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${layout.w} ${layout.h}`}
        className="h-24 w-full"
        role="img"
        aria-label="Caminho mediano após a condição"
      >
        <line
          x1="0"
          x2={layout.w}
          y1={layout.zeroY}
          y2={layout.zeroY}
          stroke="var(--color-border)"
          strokeDasharray="3 4"
        />
        <path
          d={layout.area}
          fill={layout.up ? "color-mix(in oklab, var(--color-up) 18%, transparent)" : "color-mix(in oklab, var(--color-down) 18%, transparent)"}
        />
        <path
          d={layout.d}
          fill="none"
          stroke={layout.up ? "var(--color-up)" : "var(--color-down)"}
          strokeWidth="1.8"
        />
      </svg>
      <p className="mt-1 text-xs text-muted">
        Caminho mediano até {horizon.label.split(" · ")[0]}:{" "}
        <span className={cn("font-mono tabular-nums", layout.up ? "text-up" : "text-down")}>
          {formatPct(layout.last)}
        </span>
      </p>
    </div>
  );
}
