import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { FeatureGate } from '../src/components/FeatureGate';
import { useSubscriptionStore } from '../src/store/subscription';

jest.mock('../src/store/subscription');

const mockUseSubscriptionStore = useSubscriptionStore as jest.MockedFunction<
  typeof useSubscriptionStore
>;

describe('FeatureGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when user is pro', async () => {
    mockUseSubscriptionStore.mockReturnValue({ isPro: true } as never);
    await render(
      <FeatureGate feature="firmware">
        <Text>Pro Feature</Text>
      </FeatureGate>,
    );
    expect(screen.getByText('Pro Feature')).toBeTruthy();
  });

  it('shows lock overlay when user is free', async () => {
    mockUseSubscriptionStore.mockReturnValue({ isPro: false } as never);
    await render(
      <FeatureGate feature="firmware">
        <Text>Locked Feature</Text>
      </FeatureGate>,
    );
    expect(
      screen.getAllByText('🔒', { includeHiddenElements: true }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('displays feature name text when free', async () => {
    mockUseSubscriptionStore.mockReturnValue({ isPro: false } as never);
    await render(
      <FeatureGate feature="firmware">
        <Text>Locked</Text>
      </FeatureGate>,
    );
    expect(
      screen.getAllByText('firmware', { includeHiddenElements: true }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('shows upgradeToUnlock text when free', async () => {
    mockUseSubscriptionStore.mockReturnValue({ isPro: false } as never);
    await render(
      <FeatureGate feature="firmware">
        <Text>Locked</Text>
      </FeatureGate>,
    );
    expect(
      screen.getAllByText('subscriptionGate.upgradeToUnlock', { includeHiddenElements: true })
        .length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('passes through children without wrapper when pro', async () => {
    mockUseSubscriptionStore.mockReturnValue({ isPro: true } as never);
    const { toJSON } = await render(
      <FeatureGate feature="darkPool">
        <Text>Unlocked Content</Text>
      </FeatureGate>,
    );
    expect(screen.getByText('Unlocked Content')).toBeTruthy();
    expect(screen.queryAllByText('🔒', { includeHiddenElements: true }).length).toBe(0);
  });
});
