export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetTheme = 'auto' | 'light' | 'dark';

export interface WidgetConfig {
  size: WidgetSize;
  showHashrate: boolean;
  showOnlineCount: boolean;
  showAvgTemp: boolean;
  showFleetHealth: boolean;
  showAlertCount: boolean;
  theme: WidgetTheme;
}

export const WIDGET_SIZE_LABELS: Record<WidgetSize, string> = {
  small: '2×2',
  medium: '4×2',
  large: '4×4',
};

export const WIDGET_SIZE_GRID: Record<WidgetSize, { width: number; height: number }> = {
  small: { width: 2, height: 2 },
  medium: { width: 4, height: 2 },
  large: { width: 4, height: 4 },
};
