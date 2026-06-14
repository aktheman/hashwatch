import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { SubscriptionGate } from '../src/components/SubscriptionGate';

jest.mock('../src/store/subscription', () => ({
  useSubscriptionStore: jest.fn(),
}));

import { useSubscriptionStore } from '../src/store/subscription';

const mockUseSubscriptionStore = useSubscriptionStore as jest.MockedFunction<
  typeof useSubscriptionStore
>;

describe('SubscriptionGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when pro', async () => {
    mockUseSubscriptionStore.mockReturnValue({ isPro: true } as never);
    const { getByText } = await render(
      <SubscriptionGate>
        <Text>Pro Content</Text>
      </SubscriptionGate>,
    );
    expect(getByText('Pro Content')).toBeTruthy();
  });

  it('renders overlay with lock icon when not pro', async () => {
    mockUseSubscriptionStore.mockReturnValue({ isPro: false } as never);
    const { getAllByText } = await render(
      <SubscriptionGate feature="Advanced Charts">
        <Text>Locked Content</Text>
      </SubscriptionGate>,
    );
    expect(getAllByText('🔒', { includeHiddenElements: true }).length).toBeGreaterThanOrEqual(1);
    expect(
      getAllByText('Upgrade to Pro to unlock', { includeHiddenElements: true }).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      getAllByText('Advanced Charts', { includeHiddenElements: true }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders overlay without feature name when not provided', async () => {
    mockUseSubscriptionStore.mockReturnValue({ isPro: false } as never);
    const { getAllByText } = await render(
      <SubscriptionGate>
        <Text>Locked</Text>
      </SubscriptionGate>,
    );
    expect(getAllByText('🔒', { includeHiddenElements: true }).length).toBeGreaterThanOrEqual(1);
    expect(
      getAllByText('Upgrade to Pro to unlock', { includeHiddenElements: true }).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
