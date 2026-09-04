import { useMemo } from "react";
import { cn } from "@/lib/utils";

/** Mini gráfico de linha só com fechamentos — sem eixos, sem candle. */
export function Sparkline({ closes, className }: { closes: number[]; className?: string }) {
  const layout = useMemo(() => {
    if (closes.length < 2) return null;
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const w = 200;
    const h = 56;
    const x = (i: number) => (i / (closes.length - 1)) * w;
    const y = (v: number) => h - ((v - min) / span) * h;
    const d = closes
      .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");
    const up = closes[closes.length - 1]! >= closes[0]!;
    return { w, h, d, up };
  }, [closes]);

  if (!layout) return null;

  return (
    <svg
      viewBox={`0 0 ${layout.w} ${layout.h}`}
      className={cn("h-14 w-full", className)}
      role="img"
      aria-label="Série recente de fechamentos"
    >
      <path
        d={layout.d}
        fill="none"
        stroke={layout.up ? "var(--color-up)" : "var(--color-down)"}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
