import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { spacing, fontSize, fontWeight } from '../utils/design';

interface LiveActivityBadgeProps {
  count: number;
}

export function LiveActivityBadge({ count }: LiveActivityBadgeProps) {
  const theme = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (count <= 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [count, pulseAnim]);

  if (count <= 0) return null;

  return (
    <View style={styles.container} accessibilityLabel={`${count} live activities`}>
      <Animated.View
        style={[styles.dot, { backgroundColor: theme.danger, transform: [{ scale: pulseAnim }] }]}
      />
      <Text style={[styles.count, { color: theme.text }]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  count: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
