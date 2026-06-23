import Svg, { Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';
import { useTheme } from '../theme';
import { useMinerStore } from '../store/miners';

const CONTINENTS = `
  M22,28 C16,28 8,26 6,20 C4,14 8,6 14,3 C20,2 28,2 32,6 C34,10 32,16 28,22 C26,26 24,28 22,28
  M34,3 C36,1 40,2 42,5 C40,8 36,8 34,6 Z
  M20,30 C26,28 32,28 36,32 C38,36 36,44 32,48 C28,50 24,48 22,42 C20,36 18,32 20,30
  M42,8 C44,4 50,3 56,6 C58,10 56,14 52,16 C48,18 42,14 42,8
  M42,16 C48,13 56,12 62,18 C66,24 62,34 56,38 C50,40 44,36 42,30 C40,24 38,20 42,16
  M56,6 C62,2 74,1 86,4 C94,8 98,14 94,22 C90,30 80,32 72,30 C64,28 58,22 54,18 C52,12 52,8 56,6
  M66,36 C72,34 80,36 84,40 C86,44 80,48 74,48 C68,47 64,42 66,36
  M60,34 C62,32 64,34 62,36 Z
  M40,6 C42,4 44,6 42,8 Z
  M96,16 C98,14 100,16 98,18 Z
  M80,28 C84,26 88,28 86,30 C84,32 80,30 80,28
`;

const DOT_POSITIONS = [
  { x: 16, y: 12 },
  { x: 26, y: 14 },
  { x: 12, y: 20 },
  { x: 30, y: 40 },
  { x: 22, y: 36 },
  { x: 46, y: 8 },
  { x: 52, y: 10 },
  { x: 48, y: 14 },
  { x: 44, y: 22 },
  { x: 52, y: 22 },
  { x: 58, y: 28 },
  { x: 66, y: 10 },
  { x: 76, y: 14 },
  { x: 86, y: 10 },
  { x: 90, y: 16 },
  { x: 72, y: 40 },
  { x: 30, y: 8 },
  { x: 82, y: 28 },
  { x: 38, y: 4 },
];

export function WorldMap() {
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);
  const count = Math.min(miners.length, DOT_POSITIONS.length);
  const active = miners.filter((m) => m.isOnline).length;

  return (
    <Svg width={340} height={170} viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
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
        strokeWidth="0.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {(count > 0 ? DOT_POSITIONS.slice(0, count) : []).map((pos, i) => (
        <Circle
          key={i}
          cx={pos.x}
          cy={pos.y}
          r={1.2 + (i % 3) * 0.3}
          fill={i < active ? theme.primaryLight : theme.textMuted}
          opacity={0.85}
        />
      ))}
    </Svg>
  );
}
