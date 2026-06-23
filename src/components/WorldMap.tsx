import Svg, { Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';
import { useTheme } from '../theme';

const CONTINENTS = `
  M18 42 L22 30 L30 24 L48 24 L60 30 L68 40 L70 56 L60 68 L44 72 L28 68 L18 56
  M26 48 L30 42 L38 40 L44 42 L44 50 L36 52 L28 50
  M76 30 L78 36 L82 34 L82 40 L78 40
`;

export function WorldMap() {
  const theme = useTheme();
  return (
    <Svg width={340} height={170} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="worldGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.surfaceLight} stopOpacity="1" />
          <Stop offset="1" stopColor={theme.surface} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Path
        d={CONTINENTS}
        fill="url(#worldGrad)"
        stroke={theme.border}
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Circle cx="28" cy="44" r="1.5" fill={theme.primaryLight} />
      <Circle cx="36" cy="40" r="1.7" fill={theme.primaryLight} />
      <Circle cx="44" cy="42" r="1.3" fill={theme.primaryLight} />
      <Circle cx="52" cy="38" r="1.6" fill={theme.primaryLight} />
      <Circle cx="60" cy="46" r="1.4" fill={theme.primaryLight} />
      <Circle cx="72" cy="38" r="1.2" fill={theme.primaryLight} />
      <Circle cx="66" cy="52" r="1.5" fill={theme.primaryLight} />
    </Svg>
  );
}
