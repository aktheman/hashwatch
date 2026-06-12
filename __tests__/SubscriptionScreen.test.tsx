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
  expect(screen.getByText('Free')).toBeTruthy();
  expect(screen.getByText('Pro')).toBeTruthy();
  expect(screen.getByText('$0')).toBeTruthy();
  expect(screen.getByText('$4.99')).toBeTruthy();
});

it('shows upgrade button for free users', async () => {
  await render(<SubscriptionScreen />);
  expect(screen.getByText('Upgrade to Pro')).toBeTruthy();
});

it('shows restore purchases button', async () => {
  await render(<SubscriptionScreen />);
  expect(screen.getByText('Restore Purchases')).toBeTruthy();
});

it('shows Active badge for pro users', async () => {
  useSubscriptionStore.getState().setPro();

  await render(<SubscriptionScreen />);
  expect(screen.getByText('Active')).toBeTruthy();
  expect(screen.queryByText('Upgrade to Pro')).toBeNull();
});

it('displays feature list', async () => {
  await render(<SubscriptionScreen />);
  expect(screen.getAllByText(/Unlimited miners/).length).toBe(3);
  expect(screen.getByText(/30-day charts/)).toBeTruthy();
  expect(screen.getByText(/Push notifications/)).toBeTruthy();
});
