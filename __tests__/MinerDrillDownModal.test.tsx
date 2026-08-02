jest.mock('../src/components/ChartWidgets', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    Sparkline: (props: any) => React.createElement(View, { testID: 'sparkline' }),
  };
});

jest.mock('../src/db/database', () => ({
  getSnapshots: jest.fn(),
}));

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import React from 'react';
import { MinerDrillDownModal } from '../src/components/MinerDrillDownModal';
import { setTheme, darkTheme } from '../src/theme';

const mockGetSnapshots = jest.requireMock('../src/db/database').getSnapshots as jest.Mock;

const baseMiner: any = {
  id: 'm1',
  name: 'Miner A',
  ip: '10.0.0.1',
  port: 80,
  isOnline: true,
  status: {
    hashRate: 500,
    hashRateUnit: 'GH/s',
    power: 12,
    temperature: 45,
    uptimeSeconds: 86400,
  },
};

const snapshots: any[] = [
  {
    minerId: 'm1',
    timestamp: 1,
    hashRate: 100,
    hashRateUnit: 'GH/s',
    power: 10,
    temperature: 40,
    uptimeSeconds: 3600,
  },
  {
    minerId: 'm1',
    timestamp: 2,
    hashRate: 200,
    hashRateUnit: 'GH/s',
    power: 11,
    temperature: 42,
    uptimeSeconds: 7200,
  },
  {
    minerId: 'm1',
    timestamp: 3,
    hashRate: 300,
    hashRateUnit: 'GH/s',
    power: 12,
    temperature: 45,
    uptimeSeconds: 10800,
  },
];

const onClose = jest.fn();

const renderModal = (overrides: any = {}) =>
  render(
    <MinerDrillDownModal
      visible={overrides.visible ?? true}
      onClose={overrides.onClose ?? onClose}
      miners={overrides.miners ?? [baseMiner]}
      metricType={overrides.metricType ?? 'hashrate'}
      title={overrides.title ?? 'Drill down'}
    />,
  );

beforeEach(() => {
  cleanup();
  setTheme(darkTheme);
  onClose.mockClear();
  mockGetSnapshots.mockReset();
  mockGetSnapshots.mockResolvedValue([]);
});

describe('MinerDrillDownModal', () => {
  it('renders the title', async () => {
    await renderModal({ title: 'Hashrate drill-down' });
    expect(screen.getByText('Hashrate drill-down')).toBeTruthy();
  });

  it('renders hashrate metric value and miner name', async () => {
    mockGetSnapshots.mockResolvedValue(snapshots);
    await renderModal({ title: 'Drill down', metricType: 'hashrate' });
    await waitFor(() => expect(screen.getByText('500.0 GH/s')).toBeTruthy());
    expect(screen.getByText('Miner A')).toBeTruthy();
  });

  it('renders power metric value', async () => {
    mockGetSnapshots.mockResolvedValue(snapshots);
    await renderModal({ metricType: 'power' });
    await waitFor(() => expect(screen.getByText('12.0W')).toBeTruthy());
  });

  it('renders uptime metric value', async () => {
    mockGetSnapshots.mockResolvedValue(snapshots);
    await renderModal({ metricType: 'uptime' });
    await waitFor(() => expect(screen.getByText('24h')).toBeTruthy());
  });

  it('renders temp metric value', async () => {
    mockGetSnapshots.mockResolvedValue(snapshots);
    await renderModal({ metricType: 'temp' });
    await waitFor(() => expect(screen.getByText('45°C')).toBeTruthy());
  });

  it('shows sparkline when chart data exists', async () => {
    mockGetSnapshots.mockResolvedValue(snapshots);
    await renderModal({ metricType: 'temp' });
    await waitFor(() => expect(screen.getByTestId('sparkline')).toBeTruthy());
  });

  it('does not show sparkline when there is no chart data', async () => {
    mockGetSnapshots.mockResolvedValue([]);
    await renderModal({ metricType: 'hashrate' });
    await waitFor(() => expect(screen.getByText('500.0 GH/s')).toBeTruthy());
    expect(screen.queryByTestId('sparkline')).toBeNull();
  });

  it('renders a row for each miner', async () => {
    mockGetSnapshots.mockResolvedValue(snapshots);
    const secondMiner = {
      ...baseMiner,
      id: 'm2',
      name: 'Miner B',
      status: { ...baseMiner.status, temperature: 60 },
    };
    await renderModal({ miners: [baseMiner, secondMiner], metricType: 'temp' });
    await waitFor(() => expect(screen.getByText('45°C')).toBeTruthy());
    expect(screen.getByText('60°C')).toBeTruthy();
    expect(screen.getByText('Miner A')).toBeTruthy();
    expect(screen.getByText('Miner B')).toBeTruthy();
  });

  it('renders with a miner that has no status data', async () => {
    const noStatus = { id: 'm2', name: 'Miner B', ip: '10.0.0.2', port: 80, isOnline: false };
    await renderModal({ miners: [noStatus], metricType: 'power' });
    await waitFor(() => expect(screen.getByText('0.0W')).toBeTruthy());
    expect(screen.getByText('Miner B')).toBeTruthy();
  });

  it('calls onClose when the close button is pressed', async () => {
    await renderModal({});
    await fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the overlay is pressed', async () => {
    await renderModal({});
    await fireEvent.press(screen.getByLabelText('Close drill-down'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading state while there are no miners', async () => {
    await renderModal({ miners: [] });
    expect(screen.getByText('Drill down')).toBeTruthy();
    expect(screen.getByLabelText('Close')).toBeTruthy();
    expect(screen.queryByText('500.0 GH/s')).toBeNull();
  });

  it('renders nothing when not visible', async () => {
    await renderModal({ visible: false });
    expect(screen.queryByText('Drill down')).toBeNull();
  });
});
