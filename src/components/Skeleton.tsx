import { useEffect, useRef } from 'react';
import { Animated, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height = 16, borderRadius = 8, style }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
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
