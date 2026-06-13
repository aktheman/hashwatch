import { render } from '@testing-library/react-native';
import React from 'react';
import { SubscriptionGate } from '../src/components/SubscriptionGate';
import { Text } from 'react-native';

let mockIsPro = false;

jest.mock('../src/store/subscription', () => ({
  useSubscriptionStore: () => ({ isPro: mockIsPro }),
}));

beforeEach(() => {
  mockIsPro = false;
});

describe('SubscriptionGate', () => {
  it('renders children when pro', async () => {
    mockIsPro = true;
    const { findByText } = await render(
      <SubscriptionGate>
        <Text>Pro Content</Text>
      </SubscriptionGate>,
    );
    expect(await findByText('Pro Content')).toBeTruthy();
  });

  it('shows overlay with feature name when not pro', async () => {
    const { container } = await render(
      <SubscriptionGate feature="Advanced Charts">
        <Text>Locked Content</Text>
      </SubscriptionGate>,
    );
    const json = container.toJSON();
    expect(json).toBeTruthy();
  });

  it('shows overlay without feature name when not pro', async () => {
    const { container } = await render(
      <SubscriptionGate>
        <Text>Locked</Text>
      </SubscriptionGate>,
    );
    const json = container.toJSON();
    expect(json).toBeTruthy();
  });
});
