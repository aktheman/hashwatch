import { useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { useTheme } from '../theme';
import { useMinerStore } from '../store/miners';
import { NA, SA, EU, AF, AS, OC } from '../data/worldMap';

const DOT_POSITIONS = [
  { x: 10, y: 16 },
  { x: 80, y: 14 },
  { x: 20, y: 35 },
  { x: 78, y: 36 },
  { x: 5, y: 20 },
  { x: 72, y: 18 },
  { x: 52, y: 12 },
  { x: 66, y: 26 },
  { x: 22, y: 18 },
  { x: 85, y: 34 },
  { x: 16, y: 38 },
  { x: 88, y: 16 },
  { x: 55, y: 28 },
  { x: 75, y: 28 },
  { x: 22, y: 40 },
  { x: 70, y: 10 },
  { x: 12, y: 32 },
  { x: 82, y: 22 },
  { x: 48, y: 14 },
  { x: 58, y: 30 },
  { x: 14, y: 14 },
  { x: 76, y: 14 },
  { x: 18, y: 36 },
  { x: 60, y: 24 },
  { x: 50, y: 30 },
  { x: 80, y: 28 },
  { x: 8, y: 18 },
  { x: 68, y: 21 },
  { x: 52, y: 15 },
  { x: 54, y: 16 },
  { x: 20, y: 33 },
  { x: 57, y: 26 },
  { x: 50, y: 17 },
  { x: 78, y: 30 },
  { x: 52, y: 32 },
  { x: 72, y: 30 },
];

const CONTINENTS = [NA, SA, EU, AF, AS, OC];

export function WorldMap() {
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);
  const count = Math.min(miners.length, DOT_POSITIONS.length);
  const active = miners.filter((m) => m.isOnline).length;
  const scale = 0.05;
  const [selectedDot, setSelectedDot] = useState<number | null>(null);

  const dots = count > 0 ? DOT_POSITIONS.slice(0, count) : [];

  return (
    <View style={{ position: 'relative' }}>
      {selectedDot !== null && miners[selectedDot] && (
        <View
          style={{
            position: 'absolute',
            top: (dots[selectedDot]?.y - 18) * (280 / 76),
            left: (dots[selectedDot]?.x + 17) * (500 / 116) - 50,
            zIndex: 10,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.primaryLight,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 5,
            minWidth: 100,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: theme.text, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
            {miners[selectedDot].name}
          </Text>
          {miners[selectedDot].status && (
            <Text style={{ color: theme.textMuted, fontSize: 10 }}>
              {miners[selectedDot].status!.hashRate} {miners[selectedDot].status!.hashRateUnit}
            </Text>
          )}
        </View>
      )}
      <Svg width={500} height={280} viewBox="-17 -18 116 76" preserveAspectRatio="xMidYMid meet">
        <G transform={`scale(${scale}, ${scale})`}>
          {CONTINENTS.map((d, i) => (
            <Path
              key={i}
              d={d}
              fill={theme.primaryLight}
              fillOpacity={0.15}
              stroke={theme.primaryLight}
              strokeWidth={25}
              strokeOpacity={0.7}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </G>
        {dots.map((pos, i) => (
          <Circle
            key={i}
            cx={pos.x}
            cy={pos.y}
            r={1.5 + (i % 3) * 0.4}
            fill={i < active ? theme.primaryLight : theme.textMuted}
            opacity={0.85}
            onPress={() => setSelectedDot(selectedDot === i ? null : i)}
          />
        ))}
      </Svg>
    </View>
  );
}
