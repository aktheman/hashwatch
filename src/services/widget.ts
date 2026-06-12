import { Platform, NativeModules } from 'react-native';

const isAndroid = Platform.OS === 'android';

export function updateWidget(hashrate: string, online: number, total: number, btc: string): void {
  if (!isAndroid) return;
  try {
    NativeModules.HashWatchWidgetModule?.updateWidget(hashrate, online, total, btc);
  } catch {
    // widget module not available
  }
}
