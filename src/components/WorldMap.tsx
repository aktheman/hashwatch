import React, { useState, useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, G, Line } from 'react-native-svg';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { useMinerStore } from '../store/miners';
import { NA, SA, EU, AF, AS, OC } from '../data/worldMap';

const LOCATION_CLUSTERS: Record<string, { x: number; y: number }> = {
  Home: { x: 20, y: 18 },
  Office: { x: 75, y: 22 },
  Lab: { x: 50, y: 30 },
  Garage: { x: 30, y: 35 },
  'Data Center': { x: 60, y: 14 },
  'Mining Farm': { x: 80, y: 32 },
};

const FALLBACK_POSITIONS = [
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
];

const CONTINENTS = [NA, SA, EU, AF, AS, OC];

const LOCATION_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
];

function hashLocation(loc: string): number {
  let h = 0;
  for (let i = 0; i < loc.length; i++) {
    h = (h * 31 + loc.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getLocationColor(location: string): string {
  return LOCATION_COLORS[hashLocation(location) % LOCATION_COLORS.length];
}

interface DotInfo {
  minerIndex: number;
  x: number;
  y: number;
  location: string;
  color: string;
}

export const WorldMap = React.memo(function WorldMap() {
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);
  const [selectedDot, setSelectedDot] = useState<number | null>(null);

  const { dots, connections, locationLabels } = useMemo(() => {
    const result: DotInfo[] = [];
    const conns: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
    const labels: { x: number; y: number; name: string; color: string }[] = [];
    const grouped = new Map<string, typeof miners>();
    for (const m of miners) {
      const key = m.location || '';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(m);
    }
    const ungrouped = grouped.get('') || [];
    let fallbackIdx = 0;

    for (const [loc, group] of grouped) {
      if (!loc) continue;
      const clusterPos = LOCATION_CLUSTERS[loc] || {
        x: FALLBACK_POSITIONS[hashLocation(loc) % FALLBACK_POSITIONS.length].x,
        y: FALLBACK_POSITIONS[hashLocation(loc) % FALLBACK_POSITIONS.length].y,
      };
      const color = getLocationColor(loc);
      const count = group.length;
      const offset = Math.min(count - 1, 4);

      for (let i = 0; i < count; i++) {
        const spread = offset > 0 ? (i - offset / 2) * 1.8 : 0;
        const x = clusterPos.x + spread;
        const y = clusterPos.y + (i % 2 === 0 ? -1 : 1) * 0.8;
        result.push({
          minerIndex: miners.indexOf(group[i]),
          x,
          y,
          location: loc,
          color,
        });
      }

      if (count > 1) {
        for (let i = 1; i < count; i++) {
          conns.push({
            x1: result[result.length - count].x,
            y1: result[result.length - count].y,
            x2: result[result.length - count + i].x,
            y2: result[result.length - count + i].y,
            color,
          });
        }
      }

      labels.push({ x: clusterPos.x, y: clusterPos.y + 2.5, name: loc, color });
    }

    for (
      let i = 0;
      i < ungrouped.length && fallbackIdx < FALLBACK_POSITIONS.length;
      i++, fallbackIdx++
    ) {
      const pos = FALLBACK_POSITIONS[fallbackIdx];
      result.push({
        minerIndex: miners.indexOf(ungrouped[i]),
        x: pos.x,
        y: pos.y,
        location: '',
        color: theme.primaryLight,
      });
    }

    return { dots: result, connections: conns, locationLabels: labels };
  }, [miners, theme.primaryLight]);

  const selected = selectedDot !== null ? dots[selectedDot] : null;

  return (
    <View style={{ position: 'relative' }}>
      {selected && miners[selected.minerIndex] && (
        <View
          style={{
            position: 'absolute',
            top: (selected.y - 18) * (280 / 76),
            left: (selected.x + 17) * (500 / 116) - 50,
            zIndex: 10,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: selected.color,
            borderRadius: radius.sm,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xxs,
            minWidth: 100,
            alignItems: 'center',
          }}
        >
          <Text
            style={{ color: theme.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}
            numberOfLines={1}
          >
            {miners[selected.minerIndex].name}
          </Text>
          {selected.location && (
            <Text style={{ color: selected.color, fontSize: 9, fontWeight: fontWeight.semibold }}>
              {selected.location}
            </Text>
          )}
          {miners[selected.minerIndex].status && (
            <Text style={{ color: theme.textMuted, fontSize: fontSize.xs }}>
              {miners[selected.minerIndex].status!.hashRate}{' '}
              {miners[selected.minerIndex].status!.hashRateUnit}
            </Text>
          )}
        </View>
      )}
      <Svg width={500} height={280} viewBox="-17 -18 116 76" preserveAspectRatio="xMidYMid meet">
        <G transform="scale(0.05, 0.05)">
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
        {connections.map((c, i) => (
          <Line
            key={`conn-${i}`}
            x1={c.x1}
            y1={c.y1}
            x2={c.x2}
            y2={c.y2}
            stroke={c.color}
            strokeWidth={0.3}
            opacity={0.4}
          />
        ))}
        {dots.map((dot, i) => (
          <Circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r={1.5 + (i % 3) * 0.4}
            fill={miners[dot.minerIndex]?.isOnline ? dot.color : theme.textMuted}
            opacity={0.85}
            onPress={() => setSelectedDot(selectedDot === i ? null : i)}
          />
        ))}
        {locationLabels.map((l, i) => (
          <G key={`label-${i}`}>
            <Circle cx={l.x} cy={l.y + 0.3} r={2.5} fill={l.color} opacity={0.2} />
          </G>
        ))}
      </Svg>
    </View>
  );
});
