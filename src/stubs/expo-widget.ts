import { WidgetConfig, WidgetSize } from '../types/widget';

let currentConfig: WidgetConfig = {
  size: 'medium',
  showHashrate: true,
  showOnlineCount: true,
  showAvgTemp: true,
  showFleetHealth: true,
  showAlertCount: false,
  theme: 'auto',
};

export function getConfig(): WidgetConfig {
  return { ...currentConfig };
}

export function setConfig(config: WidgetConfig): void {
  currentConfig = { ...config };
}

export async function updateWidget(): Promise<void> {
  // Stub: When expo-widget is installed, this would call
  // ExpoWidget.updateWidget() with the current config and data
}

export async function removeWidget(): Promise<void> {
  // Stub: When expo-widget is installed, this would remove the widget
}

export function getWidgetSizePixels(size: WidgetSize): { width: number; height: number } {
  const sizes: Record<WidgetSize, { width: number; height: number }> = {
    small: { width: 170, height: 170 },
    medium: { width: 364, height: 170 },
    large: { width: 364, height: 364 },
  };
  return sizes[size];
}
