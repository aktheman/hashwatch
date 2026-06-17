import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { EfficiencyTrend } from '../src/components/EfficiencyTrend';
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

function makeSnapshot(power: number, hashRate: number): MinerSnapshot {
  return {
    minerId: '1',
    timestamp: Date.now(),
    hashRate,
    hashRateUnit: 'GH/s',
    temperature: 50,
    voltage: 1200,
    current: 3.5,
    power,
    sharesAccepted: 100,
    sharesRejected: 1,
    uptimeSeconds: 3600,
    frequency: 400,
  };
}

describe('EfficiencyTrend', () => {
  it('shows empty state with < 2 snapshots', async () => {
    await render(<EfficiencyTrend snapshots={[makeSnapshot(12, 500)]} />);
    expect(screen.getByText(/Not enough data/)).toBeTruthy();
  });

  it('renders chart with sufficient snapshots', async () => {
    const snapshots = [makeSnapshot(12, 500), makeSnapshot(12.5, 480), makeSnapshot(11.8, 510)];
    await render(<EfficiencyTrend snapshots={snapshots} />);
    expect(screen.getByText(/Average/)).toBeTruthy();
  });

  it('shows empty state when all snapshots have zero power', async () => {
    const snapshots = [makeSnapshot(0, 500), makeSnapshot(0, 480), makeSnapshot(0, 510)];
    await render(<EfficiencyTrend snapshots={snapshots} />);
    expect(screen.getByText(/Not enough data/)).toBeTruthy();
  });

  it('shows empty state when all snapshots have zero hashrate', async () => {
    const snapshots = [makeSnapshot(12, 0), makeSnapshot(12.5, 0)];
    await render(<EfficiencyTrend snapshots={snapshots} />);
    expect(screen.getByText(/Not enough data/)).toBeTruthy();
  });

  it('sets accessibility label with average efficiency', async () => {
    const snapshots = [makeSnapshot(12, 500), makeSnapshot(12, 500), makeSnapshot(12, 500)];
    await render(<EfficiencyTrend snapshots={snapshots} />);
    expect(screen.getByLabelText(/Efficiency trend/)).toBeTruthy();
  });
});
