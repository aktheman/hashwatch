import { render } from '@testing-library/react-native';
import React from 'react';

jest.setTimeout(30000);

const mockGetSetting = jest.fn();
const mockGetSnapshots = jest.fn();

jest.mock('../src/db/database', () => ({
  getSetting: (k: string) => mockGetSetting(k),
  getSnapshots: (id: string, limit: number) => mockGetSnapshots(id, limit),
}));

jest.mock('react-native-chart-kit', () => ({
  LineChart: () => null,
}));

const stableMiners: { id: string; isOnline: boolean; status: null }[] = [];

jest.mock('../src/store/miners', () => ({
  useMinerStore: (selector: (s: { miners: typeof stableMiners }) => typeof stableMiners) =>
    selector({ miners: stableMiners }),
}));

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a1a',
    surface: '#1a1a2e',
    surfaceLight: '#2a2a4e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
    primary: '#6C63FF',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  }),
}));

import { AnalyticsScreen } from '../src/screens/AnalyticsScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSetting.mockResolvedValue(null);
  mockGetSnapshots.mockResolvedValue([]);
});

describe('AnalyticsScreen', () => {
  it('renders header', async () => {
    const { findByText } = await render(<AnalyticsScreen />);
    expect(await findByText('Analytics')).toBeTruthy();
  });
});
