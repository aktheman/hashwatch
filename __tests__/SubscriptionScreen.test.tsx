import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { SubscriptionScreen } from '../src/screens/SubscriptionScreen';
import { setTheme, darkTheme } from '../src/theme';
import { useSubscriptionStore } from '../src/store/subscription';

jest.mock('../src/services/revenuecat', () => ({
  configureRevenueCat: jest.fn(),
  checkProStatus: jest.fn().mockResolvedValue(false),
  purchasePro: jest.fn(),
  restorePurchases: jest.fn(),
}));

beforeEach(() => {
  setTheme(darkTheme);
  useSubscriptionStore.setState({
    tier: 'free',
    isPro: false,
    maxMiners: 999,
    initialized: false,
    loading: false,
  });
});

it('renders free and pro plans', async () => {
  await render(<SubscriptionScreen />);
  expect(screen.getByText('subscription.free')).toBeTruthy();
  expect(screen.getByText('subscription.pro')).toBeTruthy();
  expect(screen.getByText('subscription.freePrice')).toBeTruthy();
  expect(screen.getByText('subscription.proPrice')).toBeTruthy();
});

it('shows upgrade button for free users', async () => {
  await render(<SubscriptionScreen />);
  expect(screen.getByText('subscription.startFreeTrial')).toBeTruthy();
});

it('shows restore purchases button', async () => {
  await render(<SubscriptionScreen />);
  expect(screen.getByText('subscription.restorePurchases')).toBeTruthy();
});

it('shows Active badge for pro users', async () => {
  useSubscriptionStore.getState().setPro();

  await render(<SubscriptionScreen />);
  expect(screen.getByText('subscription.active')).toBeTruthy();
  expect(screen.queryByText('subscription.startFreeTrial')).toBeNull();
});

it('displays feature list', async () => {
  await render(<SubscriptionScreen />);
  expect(screen.getByText(/Up to 4 miners/)).toBeTruthy();
  expect(screen.getAllByText(/30-day charts/).length).toBe(1);
});

it('displays pro feature list', async () => {
  await render(<SubscriptionScreen />);
  expect(screen.getByText(/Unlimited miners/)).toBeTruthy();
});
