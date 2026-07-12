interface CrashReport {
  id: string;
  message: string;
  stack?: string;
  timestamp: number;
  platform: string;
  version: string;
  context?: Record<string, unknown>;
}

interface ErrorSeverity {
  level: 'error' | 'warning' | 'info';
}

const CRASH_LOG_KEY = 'crash_reports';
const MAX_CRASH_REPORTS = 50;
const _memoryStore: CrashReport[] = [];

let _enabled = true;
let _userId: string | null = null;

export function initCrashReporting(options: { enabled?: boolean; userId?: string } = {}): void {
  _enabled = options.enabled !== false;
  _userId = options.userId || null;
}

export function setCrashUser(userId: string): void {
  _userId = userId;
}

export function clearCrashUser(): void {
  _userId = null;
}

export function captureError(
  error: Error | string,
  severity: ErrorSeverity['level'] = 'error',
  context?: Record<string, unknown>,
): CrashReport | null {
  if (!_enabled) return null;

  const report: CrashReport = {
    id: `crash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'string' ? undefined : error.stack,
    timestamp: Date.now(),
    platform: typeof navigator !== 'undefined' ? 'web' : 'native',
    version: '2.0.0',
    context: {
      ...context,
      severity,
      userId: _userId,
    },
  };

  if (_enabled) {
    try {
      const existing = getCrashReports();
      existing.unshift(report);
      if (existing.length > MAX_CRASH_REPORTS) existing.pop();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CRASH_LOG_KEY, JSON.stringify(existing));
      } else if (existing !== _memoryStore) {
        _memoryStore.unshift(report);
        if (_memoryStore.length > MAX_CRASH_REPORTS) _memoryStore.pop();
      }
    } catch {}
  }

  if (severity === 'error') {
    console.error('[CrashReport]', report.message, report.stack);
  }

  return report;
}

export function captureMessage(
  message: string,
  severity: ErrorSeverity['level'] = 'info',
  context?: Record<string, unknown>,
): CrashReport | null {
  return captureError(message, severity, context);
}

export function getCrashReports(): CrashReport[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(CRASH_LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    }
  } catch {}
  return _memoryStore;
}

export function clearCrashReports(): void {
  _memoryStore.length = 0;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CRASH_LOG_KEY);
    }
  } catch {}
}

export function getCrashReportCount(): number {
  return getCrashReports().length;
}
