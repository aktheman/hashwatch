let enabled = false;
let dsn = '';

export function initErrorTracking(config: { dsn: string; enabled: boolean }) {
  dsn = config.dsn;
  enabled = config.enabled;
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!enabled || !dsn) return;
  console.error('[ErrorTracking]', error.message, context);
}

export function captureEvent(name: string, properties?: Record<string, unknown>) {
  if (!enabled || !dsn) return;
  console.log('[Analytics]', name, properties);
}
