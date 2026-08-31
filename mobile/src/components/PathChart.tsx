import { useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import type { HorizonOutcome } from "../types";
import { colors } from "../theme";

const HEIGHT = 96;

export function PathChart({ horizon }: { horizon: HorizonOutcome }) {
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const points = [0, ...horizon.medianPath];
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const span = max - min || 1;

  const toX = (i: number) => (width <= 0 ? 0 : (i / (points.length - 1)) * width);
  const toY = (v: number) => HEIGHT - ((v - min) / span) * HEIGHT;
  const zeroY = toY(0);

  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(2)} ${toY(v).toFixed(2)}`)
    .join(" ");

  const positive = points[points.length - 1]! >= 0;

  return (
    <View onLayout={onLayout} style={{ height: HEIGHT }}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          <Line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke={colors.border} strokeWidth={1} />
          <Path
            d={d}
            fill="none"
            stroke={positive ? colors.up : colors.down}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}
