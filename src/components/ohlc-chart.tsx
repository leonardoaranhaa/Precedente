import { useMemo } from "react";
import type { ChartPoint } from "@/lib/market/types";
import { formatPrice } from "@/lib/market/labels";
import { cn } from "@/lib/utils";

type Props = {
  data: ChartPoint[];
  className?: string;
};

function linePath(
  values: Array<number | null>,
  x: (i: number) => number,
  y: (v: number) => number,
): string {
  let d = "";
  let started = false;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) {
      started = false;
      continue;
    }
    d += `${started ? "L" : "M"} ${x(i).toFixed(2)} ${y(v).toFixed(2)} `;
    started = true;
  }
  return d.trim();
}

export function OhlcChart({ data, className }: Props) {
  const layout = useMemo(() => {
    if (data.length === 0) return null;
    const min = Math.min(...data.map((d) => d.l));
    const max = Math.max(...data.map((d) => d.h));
    const pad = (max - min) * 0.08 || 1;
    const yMin = min - pad;
    const yMax = max + pad;
    const w = 640;
    const h = 220;
    const left = 4;
    const right = 4;
    const top = 8;
    const bottom = 8;
    const innerW = w - left - right;
    const innerH = h - top - bottom;
    const slot = innerW / data.length;
    const y = (v: number) => top + ((yMax - v) / (yMax - yMin)) * innerH;
    const x = (i: number) => left + slot * i + slot / 2;
    const bodyW = Math.max(1.2, slot * 0.55);
    return {
      w,
      h,
      y,
      x,
      bodyW,
      sma20: linePath(
        data.map((d) => d.sma20),
        x,
        y,
      ),
      sma50: linePath(
        data.map((d) => d.sma50),
        x,
        y,
      ),
      last: data[data.length - 1]!,
    };
  }, [data]);

  if (!layout) {
    return (
      <div className={cn("flex h-48 items-center justify-center text-sm text-muted", className)}>
        Sem candles para desenhar.
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${layout.w} ${layout.h}`}
        className="h-auto w-full"
        role="img"
        aria-label="Gráfico de candles recentes com médias móveis"
      >
        <path d={layout.sma50} fill="none" stroke="var(--color-subtle)" strokeWidth="1.2" />
        <path d={layout.sma20} fill="none" stroke="var(--color-accent)" strokeWidth="1.2" />
        {data.map((d, i) => {
          const up = d.c >= d.o;
          const color = up ? "var(--color-up)" : "var(--color-down)";
          const bodyTop = layout.y(Math.max(d.o, d.c));
          const bodyBot = layout.y(Math.min(d.o, d.c));
          const bh = Math.max(0.8, bodyBot - bodyTop);
          const cx = layout.x(i);
          return (
            <g key={d.t}>
              <line
                x1={cx}
                x2={cx}
                y1={layout.y(d.h)}
                y2={layout.y(d.l)}
                stroke={color}
                strokeWidth="1"
              />
              <rect
                x={cx - layout.bodyW / 2}
                y={bodyTop}
                width={layout.bodyW}
                height={bh}
                fill={color}
                rx="0.4"
              />
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-accent" />
            SMA20
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-subtle" />
            SMA50
          </span>
        </span>
        <span className="font-mono tabular-nums text-fg">{formatPrice(layout.last.c)}</span>
      </div>
    </div>
  );
}
