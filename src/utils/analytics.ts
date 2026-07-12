interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  userId?: string;
}

const EVENTS_KEY = 'analytics_events';
const MAX_EVENTS = 500;
const _memoryStore: AnalyticsEvent[] = [];

let _enabled = true;
let _userId: string | null = null;
let _sessionId: string;

export function initAnalytics(options: { enabled?: boolean; userId?: string } = {}): void {
  _enabled = options.enabled !== false;
  _userId = options.userId || null;
  _sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function setAnalyticsUser(userId: string): void {
  _userId = userId;
}

export function clearAnalyticsUser(): void {
  _userId = null;
}

export function trackEvent(
  name: string,
  properties?: Record<string, unknown>,
): void {
  if (!_enabled) return;

  const event: AnalyticsEvent = {
    name,
    properties: {
      ...properties,
      sessionId: _sessionId,
    },
    timestamp: Date.now(),
    userId: _userId || undefined,
  };

  try {
    const existing = getEvents();
    existing.push(event);
    if (existing.length > MAX_EVENTS) existing.shift();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(existing));
    } else if (existing !== _memoryStore) {
      _memoryStore.push(event);
      if (_memoryStore.length > MAX_EVENTS) _memoryStore.shift();
    }
  } catch {}
}

export function trackScreen(screenName: string): void {
  trackEvent('screen_view', { screen: screenName });
}

export function trackFeature(featureName: string, action: string = 'use'): void {
  trackEvent('feature_use', { feature: featureName, action });
}

export function trackMinerAction(action: string, minerId?: string): void {
  trackEvent('miner_action', { action, minerId });
}

export function trackError(errorName: string, context?: Record<string, unknown>): void {
  trackEvent('error', { errorName, ...context });
}

export function getEvents(): AnalyticsEvent[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(EVENTS_KEY);
      return raw ? JSON.parse(raw) : [];
    }
  } catch {}
  return _memoryStore;
}

export function clearEvents(): void {
  _memoryStore.length = 0;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(EVENTS_KEY);
    }
  } catch {}
}

export function getEventCount(): number {
  return getEvents().length;
}

export function getFeatureUsage(): Record<string, number> {
  const events = getEvents().filter((e) => e.name === 'feature_use');
  const usage: Record<string, number> = {};
  for (const e of events) {
    const feature = e.properties?.feature as string;
    if (feature) {
      usage[feature] = (usage[feature] || 0) + 1;
    }
  }
  return usage;
}

export function getScreenViews(): Record<string, number> {
  const events = getEvents().filter((e) => e.name === 'screen_view');
  const views: Record<string, number> = {};
  for (const e of events) {
    const screen = e.properties?.screen as string;
    if (screen) {
      views[screen] = (views[screen] || 0) + 1;
    }
  }
  return views;
}
