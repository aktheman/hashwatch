import { captureEvent } from './errorTracking';

export function trackMinerAdded(pool: string) {
  captureEvent('miner_added', { pool });
}
export function trackMinerRemoved() {
  captureEvent('miner_removed');
}
export function trackThemeChanged(theme: string) {
  captureEvent('theme_changed', { theme });
}
export function trackPoolSwitched(from: string, to: string) {
  captureEvent('pool_switched', { from, to });
}
export function trackFirmwareFlash(version: string, success: boolean) {
  captureEvent('firmware_flash', { version, success });
}
export function trackAlertTriggered(type: string, minerId: string) {
  captureEvent('alert_triggered', { type, minerId });
}
export function trackScreenView(screen: string) {
  captureEvent('screen_view', { screen });
}
export function trackHealthScore(score: number, grade: string) {
  captureEvent('health_score', { score, grade });
}
