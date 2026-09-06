import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme";

const W = 80;
const H = 24;

export function Sparkline({ closes }: { closes: number[] }) {
  const layout = useMemo(() => {
    if (closes.length < 2) return null;
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const pad = 1;
    const x = (i: number) => pad + ((W - pad * 2) * i) / (closes.length - 1);
    const y = (v: number) => pad + (H - pad * 2) * (1 - (v - min) / span);
    const d = closes
      .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .join(" ");
    const up = closes[closes.length - 1]! >= closes[0]!;
    return { d, up };
  }, [closes]);

  if (!layout) return null;

  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Path
          d={layout.d}
          fill="none"
          stroke={layout.up ? colors.up : colors.down}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
