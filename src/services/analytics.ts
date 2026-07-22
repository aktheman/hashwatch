import { captureEvent } from './errorTracking';
import { capture } from './posthog';

export function trackMinerAdded(pool: string) {
  captureEvent('miner_added', { pool });
  capture('miner_added', { pool });
}
export function trackMinerRemoved() {
  captureEvent('miner_removed');
  capture('miner_removed');
}
export function trackThemeChanged(theme: string) {
  captureEvent('theme_changed', { theme });
  capture('theme_changed', { theme });
}
export function trackPoolSwitched(from: string, to: string) {
  captureEvent('pool_switched', { from, to });
  capture('pool_switched', { from, to });
}
export function trackFirmwareFlash(version: string, success: boolean) {
  captureEvent('firmware_flash', { version, success });
  capture('firmware_flash', { version, success });
}
export function trackAlertTriggered(type: string, minerId: string) {
  captureEvent('alert_triggered', { type, minerId });
  capture('alert_triggered', { type, minerId });
}
export function trackScreenView(screen: string) {
  captureEvent('screen_view', { screen });
  capture('screen_view', { screen });
}
export function trackHealthScore(score: number, grade: string) {
  captureEvent('health_score', { score, grade });
  capture('health_score', { score, grade });
}
