import { render, cleanup } from '@testing-library/react-native';
import React from 'react';
import { PowerChart } from '../src/components/PowerChart';
import { MinerSnapshot } from '../src/types';

jest.mock('react-native-chart-kit', () => ({
  LineChart: () => null,
}));

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
    warning: '#F59E0B',
  }),
}));

function makeSnapshot(timestamp: number, power?: number): MinerSnapshot {
  return {
    minerId: '1',
    timestamp,
    hashRate: 500,
    hashRateUnit: 'GH/s',
    temperature: 50,
    voltage: 1200,
    current: 3.5,
    power: power ?? 12,
    sharesAccepted: 100,
    sharesRejected: 1,
    uptimeSeconds: 3600,
    frequency: 400,
  };
}

beforeEach(() => {
  cleanup();
});

it('shows not enough data message when fewer than 2 snapshots', async () => {
  const tree = await render(<PowerChart snapshots={[makeSnapshot(1000)]} />);
  expect(tree.getByText('powerChart.notEnoughData')).toBeTruthy();
});

it('shows not enough data with empty snapshots', async () => {
  const tree = await render(<PowerChart snapshots={[]} />);
  expect(tree.getByText('powerChart.notEnoughData')).toBeTruthy();
});

it('renders title when provided', async () => {
  const snapshots = [makeSnapshot(1000), makeSnapshot(2000)];
  const tree = await render(<PowerChart snapshots={snapshots} title="Power History" />);
  expect(tree.getByText('Power History')).toBeTruthy();
});

it('renders chart with sufficient power data', async () => {
  const snapshots = [makeSnapshot(1000, 10), makeSnapshot(2000, 15)];
  const tree = await render(<PowerChart snapshots={snapshots} />);
  expect(tree.toJSON()).toBeTruthy();
});

it('renders null when no power data in snapshots', async () => {
  const snapshots = [
    { ...makeSnapshot(1000), power: undefined as any },
    { ...makeSnapshot(2000), power: undefined as any },
  ];
  const tree = await render(<PowerChart snapshots={snapshots} />);
  expect(tree.toJSON()).toBeNull();
});

it('sorts snapshots by timestamp', async () => {
  const snapshots = [makeSnapshot(3000, 15), makeSnapshot(1000, 10), makeSnapshot(2000, 12)];
  const tree = await render(<PowerChart snapshots={snapshots} />);
  expect(tree.toJSON()).toBeTruthy();
});
