import { Platform } from 'react-native';
import { getAuthToken } from '../store/authToken';

let enabled = false;
let endpoint = '';

interface QueuedError {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: number;
  platform: string;
}

interface QueuedEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  platform: string;
}

const errorQueue: QueuedError[] = [];
const eventQueue: QueuedEvent[] = [];
const FLUSH_INTERVAL_MS = 30000;
const MAX_QUEUE_SIZE = 50;
let flushTimer: ReturnType<typeof setInterval> | null = null;

export function initErrorTracking(config: { dsn?: string; enabled: boolean; endpoint?: string }) {
  enabled = config.enabled;
  endpoint = config.endpoint || '';

  if (enabled && Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('error', (e) => {
      captureError(e.error || new Error(e.message), {
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
      });
    });
    window.addEventListener('unhandledrejection', (e) => {
      const reason = e.reason;
      if (reason instanceof Error) {
        captureError(reason, { unhandledRejection: true });
      } else {
        captureError(new Error(String(reason)), { unhandledRejection: true });
      }
    });
  }

  if (!flushTimer) {
    flushTimer = setInterval(flushQueues, FLUSH_INTERVAL_MS);
    if (typeof flushTimer === 'object' && 'unref' in flushTimer) {
      flushTimer.unref();
    }
  }
}

function flushQueues() {
  if (!enabled || !endpoint) return;

  const errors = errorQueue.splice(0, MAX_QUEUE_SIZE);
  const events = eventQueue.splice(0, MAX_QUEUE_SIZE);

  if (errors.length === 0 && events.length === 0) return;

  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const payload = { errors, events, appVersion: '1.0.1' };

  fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  }).catch(() => {
    const failedErrors = errors.filter((e) => e.timestamp > Date.now() - 300000);
    errorQueue.unshift(...failedErrors);
  });
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!enabled) return;

  const entry: QueuedError = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: Date.now(),
    platform: Platform.OS,
  };

  if (endpoint) {
    if (errorQueue.length < MAX_QUEUE_SIZE) errorQueue.push(entry);
  } else {
    console.error('[ErrorTracking]', error.message, context || '');
  }
}

export function captureEvent(name: string, properties?: Record<string, unknown>) {
  if (!enabled) return;

  const entry: QueuedEvent = {
    name,
    properties,
    timestamp: Date.now(),
    platform: Platform.OS,
  };

  if (endpoint) {
    if (eventQueue.length < MAX_QUEUE_SIZE) eventQueue.push(entry);
  } else {
    console.log('[Analytics]', name, properties || '');
  }
}

export function flushErrorQueue(): Promise<void> {
  flushQueues();
  return Promise.resolve();
}
