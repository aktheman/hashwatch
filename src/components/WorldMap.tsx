import Svg, { Polygon, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme';

const WORLD_POLYGON = `20,35 25,22 35,18 55,18 72,25 80,38 82,58 70,72 52,78 30,68 18,55`;

export function WorldMap() {
  const theme = useTheme();
  return (
    <Svg width={320} height={180} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <Defs>
        <LinearGradient id="worldGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.surfaceLight} stopOpacity="1" />
          <Stop offset="1" stopColor={theme.surface} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Polygon
        points={WORLD_POLYGON}
        fill="url(#worldGrad)"
        stroke={theme.border}
        strokeWidth="0.8"
      />
    </Svg>
  );
}
