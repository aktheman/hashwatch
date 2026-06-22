import * as Sentry from '@sentry/node';

const enabled = Boolean(process.env.SENTRY_DSN);

export function initSentry() {
  if (!enabled) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
      ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
      : 0,
    profilesSampleRate: process.env.SENTRY_PROFILES_SAMPLE_RATE
      ? Number(process.env.SENTRY_PROFILES_SAMPLE_RATE)
      : 0,
    sendDefaultPii: false,
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>,
) {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    if (context) scope.setExtras(context);
    Sentry.captureMessage(message, level);
  });
}

export function isSentryEnabled() {
  return enabled;
}
