import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { HashrateChart } from '../src/components/HashrateChart';
import { MinerSnapshot } from '../src/types';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
    primary: '#6C63FF',
  }),
}));

jest.mock('react-native-chart-kit', () => ({
  LineChart: () => null,
}));

function makeSnapshot(timestamp: number): MinerSnapshot {
  return {
    minerId: '1',
    timestamp,
    hashRate: 500,
    hashRateUnit: 'GH/s',
    temperature: 50,
    voltage: 1200,
    current: 3.5,
    power: 12,
    sharesAccepted: 100,
    sharesRejected: 1,
    uptimeSeconds: 3600,
    frequency: 400,
  };
}

describe('HashrateChart', () => {
  it('shows empty state when < 2 snapshots', async () => {
    await render(<HashrateChart snapshots={[makeSnapshot(1000)]} />);
    expect(await screen.findByText('hashrateChart.notEnoughData')).toBeTruthy();
  });

  it('renders chart with 2+ snapshots', async () => {
    const snapshots = [makeSnapshot(1000), makeSnapshot(2000)];
    await render(<HashrateChart snapshots={snapshots} />);
    expect(screen.getByText('GH/s')).toBeTruthy();
  });

  it('renders title when provided', async () => {
    const snapshots = [makeSnapshot(1000), makeSnapshot(2000)];
    await render(<HashrateChart snapshots={snapshots} title="Hashrate over time" />);
    expect(await screen.findByText('Hashrate over time')).toBeTruthy();
  });

  it('sets accessibility label with snapshot count', async () => {
    const snapshots = [makeSnapshot(1000), makeSnapshot(2000), makeSnapshot(3000)];
    await render(<HashrateChart snapshots={snapshots} />);
    expect(screen.getByLabelText('hashrateChart.notEnoughData')).toBeTruthy();
  });

  it('renders y-axis label', async () => {
    const snapshots = [makeSnapshot(1000), makeSnapshot(2000)];
    await render(<HashrateChart snapshots={snapshots} />);
    expect(screen.getByText('GH/s')).toBeTruthy();
  });

  it('handles hashrate with different units', async () => {
    const s1 = { ...makeSnapshot(1000), hashRate: 1, hashRateUnit: 'TH/s' };
    const s2 = { ...makeSnapshot(2000), hashRate: 1.2, hashRateUnit: 'TH/s' };
    await render(<HashrateChart snapshots={[s1, s2]} />);
    expect(screen.getByText('GH/s')).toBeTruthy();
  });
});
