import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react-native';
import { MetricTile, ProfitabilityCard } from '../src/components/DashboardComponents';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mk = (name: string) => {
    const C = (props: any) => React.createElement(View, props);
    C.displayName = name;
    return C;
  };
  const SvgComponent = mk('Svg');
  return {
    __esModule: true,
    default: SvgComponent,
    Svg: SvgComponent,
    Polyline: mk('Polyline'),
    Polygon: mk('Polygon'),
    Circle: mk('Circle'),
    Defs: mk('Defs'),
    Stop: mk('Stop'),
    LinearGradient: mk('LinearGradient'),
  };
});

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
    accent: '#3B82F6',
    info: '#06B6D4',
    glow: 'rgba(108,99,255,0.15)',
  }),
}));

jest.mock('../src/utils/hashrate', () => ({
  getBTCPrice: () => 100000,
  getBTCPriceHistory: () => [95000, 98000, 100000],
  getNetworkHashrate: () => 750_000_000_000_000_000_000,
  estimateBTCPerDay: (hps: number) => (hps / 750_000_000_000_000_000_000) * 144 * 3.125,
  formatBTC: (btc: number) => `${btc.toFixed(8)}`,
  formatHashrateValue: (h: number) => `${(h / 1e15).toFixed(1)} EH/s`,
}));

beforeEach(() => {
  cleanup();
});

describe('MetricTile', () => {
  it('renders title and value', async () => {
    const tree = await render(<MetricTile title="Hashrate" value="500" />);
    expect(tree.getByText('Hashrate')).toBeTruthy();
    expect(tree.getByText('500')).toBeTruthy();
  });

  it('renders unit', async () => {
    const tree = await render(<MetricTile title="Temp" value="65" unit="°C" />);
    expect(tree.getByText('°C')).toBeTruthy();
  });

  it('renders label', async () => {
    const tree = await render(
      <MetricTile title="Power" value="12.5" unit="W" label="Total power draw" />,
    );
    expect(tree.getByText('Total power draw')).toBeTruthy();
  });

  it('renders trend badge', async () => {
    const tree = await render(<MetricTile title="Hashrate" value="500" trend="+12%" />);
    expect(tree.getByText('+12%')).toBeTruthy();
  });

  it('renders sparkline chart when chart prop is sparkline', async () => {
    const tree = await render(
      <MetricTile title="Hashrate" value="500" chart="sparkline" chartData={[1, 2, 3]} />,
    );
    expect(tree.toJSON()).toBeTruthy();
  });

  it('renders bars chart when chart prop is bars', async () => {
    const tree = await render(
      <MetricTile title="Block Luck" value="85%" chart="bars" chartData={[30, 50, 85]} />,
    );
    expect(tree.toJSON()).toBeTruthy();
  });

  it('renders donut chart when chart prop is donut', async () => {
    const tree = await render(<MetricTile title="Uptime" value="99.9%" chart="donut" />);
    expect(tree.toJSON()).toBeTruthy();
  });

  it('renders gauge chart when chart prop is gauge', async () => {
    const tree = await render(<MetricTile title="Load" value="65%" chart="gauge" />);
    expect(tree.toJSON()).toBeTruthy();
  });

  it('renders with different sizes', async () => {
    const tree = await render(<MetricTile title="Test" value="X" size="lg" />);
    expect(tree.toJSON()).toBeTruthy();
  });

  it('applies accent color via prop', async () => {
    const tree = await render(<MetricTile title="Test" value="X" accent="danger" />);
    expect(tree.toJSON()).toBeTruthy();
  });
});

describe('ProfitabilityCard', () => {
  it('renders BTC price with sparkline', async () => {
    const miners = [
      {
        id: 'm1',
        name: 'Miner A',
        ip: '10.0.0.1',
        port: 80,
        isOnline: true,
        status: { hashRate: 1, hashRateUnit: 'TH/s', power: 10, temperature: 55 },
      },
    ] as any[];
    const tree = await render(<ProfitabilityCard miners={miners} />);
    expect(tree.getByText('dashboardExtra.profitabilityTitle')).toBeTruthy();
    expect(tree.getByText('dashboardExtra.btcLabel')).toBeTruthy();
  });

  it('shows trend arrow up when price increased', async () => {
    const miners = [] as any[];
    const tree = await render(<ProfitabilityCard miners={miners} />);
    expect(tree.getByText(/▲/)).toBeTruthy();
  });

  it('shows trend percentage', async () => {
    const miners = [] as any[];
    const tree = await render(<ProfitabilityCard miners={miners} />);
    expect(tree.getByText(/5\.3%/)).toBeTruthy();
  });

  it('shows Total /day for empty miners', async () => {
    const tree = await render(<ProfitabilityCard miners={[]} />);
    expect(tree.getByText('dashboardExtra.total')).toBeTruthy();
  });
});
