import { useEffect, useRef } from 'react';
import { Animated, Platform, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../theme';
import { radius } from '../utils/design';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height = 16, borderRadius = radius.sm, style }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius,
          backgroundColor: theme.surfaceLight,
          opacity,
        },
        style,
      ]}
    />
  );
}
