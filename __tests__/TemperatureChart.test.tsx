import { render, cleanup } from '@testing-library/react-native';
import React from 'react';
import { TemperatureChart } from '../src/components/TemperatureChart';
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
    danger: '#EF4444',
  }),
}));

function makeSnapshot(timestamp: number, temp?: number): MinerSnapshot {
  return {
    minerId: '1',
    timestamp,
    hashRate: 500,
    hashRateUnit: 'GH/s',
    temperature: temp ?? 50,
    voltage: 1200,
    current: 3.5,
    power: 12,
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
  const tree = await render(<TemperatureChart snapshots={[makeSnapshot(1000)]} />);
  expect(tree.getByText('charts.notEnoughTemp')).toBeTruthy();
});

it('shows not enough data with empty snapshots', async () => {
  const tree = await render(<TemperatureChart snapshots={[]} />);
  expect(tree.getByText('charts.notEnoughTemp')).toBeTruthy();
});

it('renders title when provided', async () => {
  const snapshots = [makeSnapshot(1000), makeSnapshot(2000)];
  const tree = await render(<TemperatureChart snapshots={snapshots} title="Temp History" />);
  expect(tree.getByText('Temp History')).toBeTruthy();
});

it('renders chart with sufficient temperature data', async () => {
  const snapshots = [makeSnapshot(1000, 55), makeSnapshot(2000, 60)];
  const tree = await render(<TemperatureChart snapshots={snapshots} />);
  expect(tree.toJSON()).toBeTruthy();
});

it('renders null when no temperature data in snapshots', async () => {
  const snapshots = [
    { ...makeSnapshot(1000), temperature: undefined as any },
    { ...makeSnapshot(2000), temperature: undefined as any },
  ];
  const tree = await render(<TemperatureChart snapshots={snapshots} />);
  expect(tree.toJSON()).toBeNull();
});

it('sorts snapshots by timestamp', async () => {
  const snapshots = [makeSnapshot(3000, 65), makeSnapshot(1000, 55), makeSnapshot(2000, 60)];
  const tree = await render(<TemperatureChart snapshots={snapshots} />);
  expect(tree.toJSON()).toBeTruthy();
});
