import { render, cleanup } from '@testing-library/react-native';
import React from 'react';
import { ProfitabilityCard } from '../src/components/DashboardComponents';
import { setBTCPrice } from '../src/utils/hashrate';

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
  }),
}));

jest.mock('../src/utils/hashrate', () => {
  const original = jest.requireActual('../src/utils/hashrate');
  return {
    ...original,
    getBTCPrice: () => 100000,
    estimateBTCPerDay: (hps: number) => (hps / 750_000_000_000_000_000_000) * 144 * 3.125,
    formatBTC: (btc: number) => `${btc.toFixed(8)}`,
  };
});

beforeEach(() => {
  cleanup();
});

it('renders title and total', async () => {
  const miners = [
    {
      id: 'm1',
      name: 'Miner A',
      ip: '10.0.0.1',
      port: 80,
      isOnline: true,
      status: { hashRate: 1.2, hashRateUnit: 'TH/s', power: 12.5, temperature: 60 },
    },
  ] as any[];
  const tree = await render(<ProfitabilityCard miners={miners} />);
  expect(tree.getByText('≡ Profitability')).toBeTruthy();
  expect(tree.getByText('Total')).toBeTruthy();
});

it('renders per-miner breakdown', async () => {
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
  expect(tree.getByText('Miner A')).toBeTruthy();
});

it('shows week and month projections', async () => {
  const miners = [
    {
      id: 'm1',
      name: 'Miner A',
      ip: '10.0.0.1',
      port: 80,
      isOnline: true,
      status: { hashRate: 1.2, hashRateUnit: 'TH/s', power: 12, temperature: 58 },
    },
  ] as any[];
  const tree = await render(<ProfitabilityCard miners={miners} />);
  expect(tree.getByText('Week')).toBeTruthy();
  expect(tree.getByText('Month')).toBeTruthy();
});

it('shows USD/day when BTC price is positive', async () => {
  setBTCPrice(100000);
  const miners = [
    {
      id: 'm1',
      name: 'Miner A',
      ip: '10.0.0.1',
      port: 80,
      isOnline: true,
      status: { hashRate: 1.2, hashRateUnit: 'TH/s', power: 12, temperature: 58 },
    },
  ] as any[];
  const tree = await render(<ProfitabilityCard miners={miners} />);
  expect(tree.getByText('USD/day')).toBeTruthy();
});

it('shows net/day after power when powerCost is provided', async () => {
  setBTCPrice(100000);
  const miners = [
    {
      id: 'm1',
      name: 'Miner A',
      ip: '10.0.0.1',
      port: 80,
      isOnline: true,
      status: { hashRate: 1.2, hashRateUnit: 'TH/s', power: 12, temperature: 58 },
    },
  ] as any[];
  const tree = await render(<ProfitabilityCard miners={miners} powerCost={0.12} />);
  expect(tree.getByText('Net/day (after power)')).toBeTruthy();
});

it('hides net/day when powerCost is 0', async () => {
  const miners = [
    {
      id: 'm1',
      name: 'Miner A',
      ip: '10.0.0.1',
      port: 80,
      isOnline: true,
      status: { hashRate: 1.2, hashRateUnit: 'TH/s', power: 12, temperature: 58 },
    },
  ] as any[];
  const tree = await render(<ProfitabilityCard miners={miners} powerCost={0} />);
  expect(tree.queryByText('Net/day (after power)')).toBeNull();
});

it('handles multiple miners', async () => {
  const miners = [
    {
      id: 'm1',
      name: 'Miner A',
      ip: '10.0.0.1',
      port: 80,
      isOnline: true,
      status: { hashRate: 1, hashRateUnit: 'TH/s', power: 10, temperature: 55 },
    },
    {
      id: 'm2',
      name: 'Miner B',
      ip: '10.0.0.2',
      port: 80,
      isOnline: true,
      status: { hashRate: 2, hashRateUnit: 'TH/s', power: 20, temperature: 60 },
    },
  ] as any[];
  const tree = await render(<ProfitabilityCard miners={miners} />);
  expect(tree.getByText('Miner A')).toBeTruthy();
  expect(tree.getByText('Miner B')).toBeTruthy();
});

it('uses miner id as fallback when name is missing', async () => {
  const miners = [
    {
      id: 'miner-abc',
      ip: '10.0.0.1',
      port: 80,
      isOnline: true,
      status: { hashRate: 1, hashRateUnit: 'TH/s', power: 10, temperature: 55 },
    },
  ] as any[];
  const tree = await render(<ProfitabilityCard miners={miners} />);
  expect(tree.getByText('miner-abc')).toBeTruthy();
});

it('renders with empty miners list', async () => {
  const tree = await render(<ProfitabilityCard miners={[]} />);
  expect(tree.getByText('≡ Profitability')).toBeTruthy();
});
