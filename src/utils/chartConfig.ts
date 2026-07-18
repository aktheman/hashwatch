import { fontSize } from './design';
import { Theme } from '../theme';

export const CHART_WIDTH = 340;
export const CHART_HEIGHT = 200;

export function getChartConfig(theme: Theme, decimalPlaces: number = 1): Record<string, unknown> {
  return {
    backgroundColor: theme.surface,
    backgroundGradientFrom: theme.surface,
    backgroundGradientTo: theme.surface,
    decimalPlaces,
    color: () => theme.textMuted,
    labelColor: () => theme.textMuted,
    propsForDots: {
      r: '3',
      strokeWidth: '2',
      stroke: theme.primary,
      fill: theme.surface,
    },
    propsForBackgroundLines: {
      strokeDasharray: '4',
      stroke: theme.border,
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: fontSize.xs,
    },
  };
}
