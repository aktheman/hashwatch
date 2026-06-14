import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { OfflineBanner } from '../src/components/OfflineBanner';

let mockIsOnline = true;

jest.mock('../src/services/networkStatus', () => ({
  useNetworkStatus: () => ({ isOnline: mockIsOnline, type: null }),
}));

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    warning: '#F59E0B',
    text: '#000',
  }),
}));

describe('OfflineBanner', () => {
  beforeEach(() => {
    mockIsOnline = true;
  });

  it('renders nothing when online', async () => {
    const { toJSON } = await render(<OfflineBanner />);
    expect(toJSON()).toBeNull();
  });

  it('shows offline message when offline', async () => {
    mockIsOnline = false;
    await render(<OfflineBanner />);
    expect(screen.getByText(/offline/)).toBeTruthy();
  });

  it('has accessibility label when offline', async () => {
    mockIsOnline = false;
    await render(<OfflineBanner />);
    expect(screen.getByLabelText(/offline/)).toBeTruthy();
  });
});
