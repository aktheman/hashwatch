import Svg, { Polygon, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { useTheme } from '../theme';

const WORLD_POLYGON = `20,35 25,22 35,18 55,18 72,25 80,38 82,58 70,72 52,78 30,68 18,55`;

export function WorldMap() {
  const theme = useTheme();
  return (
    <Svg width={320} height={180} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <Defs>
        <LinearGradient id="worldGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.surface} stopOpacity="1" />
          <Stop offset="1" stopColor={theme.surfaceLight} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Polygon
        points={WORLD_POLYGON}
        fill="url(#worldGrad)"
        stroke={theme.border}
        strokeWidth="0.8"
      />
      <Circle cx="30" cy="32" r="1.4" fill={theme.primaryLight} />
      <Circle cx="38" cy="28" r="1.2" fill={theme.primaryLight} />
      <Circle cx="55" cy="30" r="1.6" fill={theme.primaryLight} />
      <Circle cx="68" cy="35" r="1.3" fill={theme.primaryLight} />
      <Circle cx="72" cy="45" r="1.1" fill={theme.primaryLight} />
      <Circle cx="60" cy="55" r="1.2" fill={theme.primaryLight} />
      <Circle cx="45" cy="60" r="1.0" fill={theme.primaryLight} />
      <Circle cx="25" cy="50" r="1.3" fill={theme.primaryLight} />
    </Svg>
  );
}
