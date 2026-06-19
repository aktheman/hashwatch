import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import en from '../src/i18n/en.json';

// expo-localization is only used by the i18n module at import time
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

it('en.json has all required namespaces', () => {
  expect(en.common).toBeDefined();
  expect(en.dashboard).toBeDefined();
  expect(en.pools).toBeDefined();
  expect(en.analytics).toBeDefined();
  expect(en.settings).toBeDefined();
  expect(en.minerDetail).toBeDefined();
  expect(en.addMiner).toBeDefined();
  expect(en.wallets).toBeDefined();
  expect(en.groups).toBeDefined();
  expect(en.subscription).toBeDefined();
  expect(en.import).toBeDefined();
  expect(en.onboarding).toBeDefined();
  expect(en.themes).toBeDefined();
  expect(en.tabs).toBeDefined();
  expect(en.navigator).toBeDefined();
  expect(en.minerCard).toBeDefined();
  expect(en.earningsCard).toBeDefined();
  expect(en.efficiencyTrend).toBeDefined();
  expect(en.errorBoundary).toBeDefined();
  expect(en.firmwareBanner).toBeDefined();
  expect(en.hashrateChart).toBeDefined();
  expect(en.notificationPrefs).toBeDefined();
  expect(en.offlineBanner).toBeDefined();
  expect(en.subscriptionGate).toBeDefined();
});

it('common namespace has expected keys', () => {
  expect(en.common.add).toBe('Add');
  expect(en.common.save).toBe('Save');
  expect(en.common.cancel).toBe('Cancel');
  expect(en.common.retry).toBe('Retry');
  expect(en.common.goBack).toBe('Go Back');
});

it('earningsCard namespace has all keys', () => {
  expect(en.earningsCard.title).toBe('Estimated Earnings');
  expect(en.earningsCard.perDay).toBe('per day');
  expect(en.earningsCard.perDayEst).toBe('per day (est.)');
  expect(en.earningsCard.satDay).toBe('~{{sats}} sat/day');
});

it('errorBoundary namespace has all keys', () => {
  expect(en.errorBoundary.somethingWentWrong).toBe('Something went wrong');
  expect(en.errorBoundary.unexpectedError).toBe('An unexpected error occurred');
  expect(en.errorBoundary.tryAgain).toBe('Try Again');
  expect(en.errorBoundary.screenError).toBe('Screen Error');
});

it('notificationPrefs namespace has all keys', () => {
  expect(en.notificationPrefs.title).toBe('Notifications');
  expect(en.notificationPrefs.offline).toBe('Offline');
  expect(en.notificationPrefs.online).toBe('Reconnected');
  expect(en.notificationPrefs.hot).toBe('High Temperature');
  expect(en.notificationPrefs.hashrateDrop).toBe('Hashrate Drop');
  expect(en.notificationPrefs.poolLost).toBe('Pool Lost');
  expect(en.notificationPrefs.longUptime).toBe('Long Uptime');
});

it('offlineBanner namespace has all keys', () => {
  expect(en.offlineBanner.offline).toBe('You are offline — showing cached data');
});

it('firmwareBanner namespace has all keys', () => {
  expect(en.firmwareBanner.updateAvailable).toBe('Firmware Update Available');
});

it('hashrateChart namespace has all keys', () => {
  expect(en.hashrateChart.notEnoughData).toBe('Not enough data for chart');
});

it('subscriptionGate namespace has all keys', () => {
  expect(en.subscriptionGate.upgradeToUnlock).toBe('Upgrade to Pro to unlock');
});

it('i18n mock t returns key unchanged', () => {
  const { t } = require('react-i18next').useTranslation();
  expect(t('test.key')).toBe('test.key');
  expect(t('common.retry')).toBe('common.retry');
});

it('i18n mock t replaces {{var}} placeholders', () => {
  const { t } = require('react-i18next').useTranslation();
  const result = t('hello {{name}}', { name: 'World' });
  expect(result).toBe('hello World');
});

it('i18n mock t handles no opts gracefully', () => {
  const { t } = require('react-i18next').useTranslation();
  expect(t('simple.key')).toBe('simple.key');
});
