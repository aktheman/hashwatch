import { Platform } from 'react-native';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let posthogLoaded = false;
let posthogClient: PostHogClient | null = null;

interface PostHogClient {
  identify: (id: string, props?: Record<string, unknown>) => void;
  capture: (event: string, props?: Record<string, unknown>) => void;
  reset: () => void;
  shutdown: () => void;
}

async function loadPostHog(): Promise<PostHogClient | null> {
  if (posthogLoaded) return posthogClient;
  if (!POSTHOG_KEY || Platform.OS !== 'web') return null;

  try {
    const PostHog = (await import('posthog-js')).default;
    PostHog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      capture_pageleave: false,
      autocapture: false,
      persistence: 'localStorage',
    });
    posthogClient = PostHog;
    posthogLoaded = true;
    return posthogClient;
  } catch {
    return null;
  }
}

export async function identifyUser(userId: string, properties?: Record<string, unknown>) {
  const ph = await loadPostHog();
  if (ph) {
    ph.identify(userId, properties);
  }
}

export async function capture(event: string, properties?: Record<string, unknown>) {
  const ph = await loadPostHog();
  if (ph) {
    ph.capture(event, properties);
  }
}

export async function resetUser() {
  const ph = await loadPostHog();
  if (ph) {
    ph.reset();
  }
}

export async function shutdownPostHog() {
  const ph = await loadPostHog();
  if (ph) {
    ph.shutdown();
  }
}
