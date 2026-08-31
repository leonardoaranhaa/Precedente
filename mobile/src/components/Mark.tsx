import Svg, { Rect } from "react-native-svg";
import { colors } from "../theme";

export function Mark({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x="4" y="14" width="5" height="10" rx="0.8" fill={colors.accent} opacity={0.55} />
      <Rect x="6.1" y="10" width="0.8" height="18" fill={colors.accent} opacity={0.55} />
      <Rect x="13.5" y="8" width="5" height="14" rx="0.8" fill={colors.accent} />
      <Rect x="15.6" y="5" width="0.8" height="20" fill={colors.accent} />
      <Rect x="23" y="12" width="5" height="8" rx="0.8" fill={colors.accent} opacity={0.7} />
      <Rect x="25.1" y="9" width="0.8" height="14" fill={colors.accent} opacity={0.7} />
    </Svg>
  );
}
