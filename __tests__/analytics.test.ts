import {
  initAnalytics,
  trackEvent,
  trackScreen,
  trackFeature,
  trackMinerAction,
  trackError,
  getEvents,
  clearEvents,
  getEventCount,
  getFeatureUsage,
  getScreenViews,
  setAnalyticsUser,
  clearAnalyticsUser,
} from '../src/utils/analytics';

beforeEach(() => {
  clearEvents();
  initAnalytics({ enabled: true });
});

describe('analytics utils', () => {
  test('trackEvent stores event', () => {
    trackEvent('test_event', { key: 'value' });
    expect(getEvents()).toHaveLength(1);
    expect(getEvents()[0].name).toBe('test_event');
    expect(getEvents()[0].properties).toMatchObject({ key: 'value' });
  });

  test('trackScreen creates screen_view event', () => {
    trackScreen('Dashboard');
    expect(getEvents()).toHaveLength(1);
    expect(getEvents()[0].name).toBe('screen_view');
    expect(getEvents()[0].properties).toMatchObject({ screen: 'Dashboard' });
  });

  test('trackFeature creates feature_use event', () => {
    trackFeature('mining_stats', 'view');
    expect(getEvents()[0].name).toBe('feature_use');
    expect(getEvents()[0].properties).toMatchObject({ feature: 'mining_stats', action: 'view' });
  });

  test('trackFeature default action', () => {
    trackFeature('alerts');
    expect(getEvents()[0].properties).toMatchObject({ feature: 'alerts', action: 'use' });
  });

  test('trackMinerAction creates event', () => {
    trackMinerAction('restart', 'miner1');
    expect(getEvents()[0].name).toBe('miner_action');
    expect(getEvents()[0].properties).toMatchObject({ action: 'restart', minerId: 'miner1' });
  });

  test('trackError creates event', () => {
    trackError('network_timeout', { url: '/api' });
    expect(getEvents()[0].name).toBe('error');
  });

  test('disabled does not store', () => {
    initAnalytics({ enabled: false });
    trackEvent('should_not_store');
    expect(getEvents()).toHaveLength(0);
  });

  test('clearEvents empties storage', () => {
    trackEvent('e1');
    clearEvents();
    expect(getEvents()).toHaveLength(0);
  });

  test('getEventCount', () => {
    trackEvent('a');
    trackEvent('b');
    expect(getEventCount()).toBe(2);
  });

  test('getFeatureUsage aggregates', () => {
    trackFeature('alerts');
    trackFeature('alerts');
    trackFeature('wallets');
    const usage = getFeatureUsage();
    expect(usage.alerts).toBe(2);
    expect(usage.wallets).toBe(1);
  });

  test('getScreenViews aggregates', () => {
    trackScreen('Dashboard');
    trackScreen('Dashboard');
    trackScreen('Settings');
    const views = getScreenViews();
    expect(views.Dashboard).toBe(2);
    expect(views.Settings).toBe(1);
  });

  test('includes userId when set', () => {
    setAnalyticsUser('user1');
    trackEvent('auth_event');
    expect(getEvents()[0].userId).toBe('user1');
  });

  test('clearAnalyticsUser removes userId', () => {
    setAnalyticsUser('user1');
    clearAnalyticsUser();
    trackEvent('no_user');
    expect(getEvents()[0].userId).toBeUndefined();
  });

  test('includes sessionId', () => {
    trackEvent('test');
    expect(getEvents()[0].properties).toHaveProperty('sessionId');
  });

  test('limits to 500 events', () => {
    for (let i = 0; i < 520; i++) {
      trackEvent(`event${i}`);
    }
    expect(getEvents()).toHaveLength(500);
  });
});
