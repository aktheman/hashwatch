import { Platform } from 'react-native';

interface WidgetData {
  onlineCount: number;
  totalCount: number;
  totalHashrate: string;
  lastUpdated: number;
}

// iOS widget data sharing via UserDefaults (App Groups)
export function updateWidgetData(data: WidgetData): void {
  if (Platform.OS !== 'ios') return;
  try {
    // Use the shared UserDefaults suite for widget data
    const userDefaults = require('react-native-userdefaults'); // eslint-disable-line @typescript-eslint/no-require-imports
    userDefaults.set(JSON.stringify(data), 'hashwatch_widget_data');
  } catch {
    // Widget not supported on this device
  }
}

export function getWidgetData(): WidgetData | null {
  if (Platform.OS !== 'ios') return null;
  try {
    const userDefaults = require('react-native-userdefaults'); // eslint-disable-line @typescript-eslint/no-require-imports
    const raw = userDefaults.get('hashwatch_widget_data');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
