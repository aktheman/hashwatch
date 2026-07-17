import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { spacing, fontSize, fontWeight, radius } from '../utils/design';
import { useTheme } from '../theme';

export function AlertRuleSlider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const theme = useTheme();
  const step = unit === 'min' || unit === 'h' ? 1 : 5;
  return (
    <View style={{ paddingVertical: spacing.xs }}>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xxs }}
      >
        <Text style={{ color: theme.text, fontSize: fontSize.base }}>{label}</Text>
        <Text
          style={{ color: theme.primary, fontSize: fontSize.base, fontWeight: fontWeight.bold }}
        >
          {value}
          {unit}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>{min}</Text>
        <View
          style={{
            flex: 1,
            height: 6,
            backgroundColor: theme.surfaceLight,
            borderRadius: radius.xxs,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${((value - min) / (max - min)) * 100}%`,
              height: 6,
              backgroundColor: theme.primary,
              borderRadius: radius.xxs,
            }}
          />
        </View>
        <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>{max}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.xxs, marginTop: spacing.xxs }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xxs,
            backgroundColor: theme.surfaceLight,
            borderRadius: radius.xxs,
          }}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Text style={{ color: theme.text, fontSize: fontSize.base }}>−</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xxs,
            backgroundColor: theme.surfaceLight,
            borderRadius: radius.xxs,
          }}
          onPress={() => onChange(Math.min(max, value + step))}
        >
          <Text style={{ color: theme.text, fontSize: fontSize.base }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}
