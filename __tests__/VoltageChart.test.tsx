import { render, cleanup } from '@testing-library/react-native';
import React from 'react';
import { VoltageChart } from '../src/components/VoltageChart';
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
    info: '#06B6D4',
  }),
}));

function makeSnapshot(timestamp: number, voltage?: number): MinerSnapshot {
  return {
    minerId: '1',
    timestamp,
    hashRate: 500,
    hashRateUnit: 'GH/s',
    temperature: 50,
    voltage: voltage ?? 1200,
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
  const tree = await render(<VoltageChart snapshots={[makeSnapshot(1000)]} />);
  expect(tree.getByText('charts.notEnoughVoltage')).toBeTruthy();
});

it('shows not enough data with empty snapshots', async () => {
  const tree = await render(<VoltageChart snapshots={[]} />);
  expect(tree.getByText('charts.notEnoughVoltage')).toBeTruthy();
});

it('renders title when provided', async () => {
  const snapshots = [makeSnapshot(1000), makeSnapshot(2000)];
  const tree = await render(<VoltageChart snapshots={snapshots} title="Voltage History" />);
  expect(tree.getByText('Voltage History')).toBeTruthy();
});

it('renders chart with sufficient voltage data', async () => {
  const snapshots = [makeSnapshot(1000, 1150), makeSnapshot(2000, 1200)];
  const tree = await render(<VoltageChart snapshots={snapshots} />);
  expect(tree.toJSON()).toBeTruthy();
});

it('renders null when no voltage data in snapshots', async () => {
  const snapshots = [
    { ...makeSnapshot(1000), voltage: undefined as any },
    { ...makeSnapshot(2000), voltage: undefined as any },
  ];
  const tree = await render(<VoltageChart snapshots={snapshots} />);
  expect(tree.toJSON()).toBeNull();
});

it('sorts snapshots by timestamp', async () => {
  const snapshots = [makeSnapshot(3000, 1200), makeSnapshot(1000, 1150), makeSnapshot(2000, 1180)];
  const tree = await render(<VoltageChart snapshots={snapshots} />);
  expect(tree.toJSON()).toBeTruthy();
});
