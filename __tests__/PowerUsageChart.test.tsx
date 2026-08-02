jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mk = (name: string) => {
    const C = (props: any) => React.createElement(View, props);
    C.displayName = name;
    return C;
  };
  const Svg = mk('Svg');
  return {
    __esModule: true,
    default: Svg,
    Svg,
    Path: mk('Path'),
    Defs: mk('Defs'),
    LinearGradient: mk('LinearGradient'),
    Stop: mk('Stop'),
  };
});

import { render, screen, cleanup } from '@testing-library/react-native';
import React from 'react';
import { PowerUsageChart } from '../src/components/PowerUsageChart';
import { setTheme, darkTheme } from '../src/theme';

const online = (id: string, name: string, power: number): any => ({
  id,
  name,
  ip: '10.0.0.1',
  port: 80,
  isOnline: true,
  status: { hashRate: 100, hashRateUnit: 'GH/s', power },
});

const offline = (id: string, name: string, power: number): any => ({
  id,
  name,
  ip: '10.0.0.2',
  port: 80,
  isOnline: false,
  status: { hashRate: 100, hashRateUnit: 'GH/s', power },
});

beforeEach(() => {
  cleanup();
  setTheme(darkTheme);
});

describe('PowerUsageChart', () => {
  it('renders title and summary values with data', async () => {
    await render(
      <PowerUsageChart
        miners={[
          online('m1', 'MinerAlpha', 120),
          online('m2', 'MinerBeta', 80),
          offline('m3', 'Offline', 999),
        ]}
      />,
    );
    expect(screen.getByText('analytics.power')).toBeTruthy();
    expect(screen.getByText('200W')).toBeTruthy();
    expect(screen.getByText('100W')).toBeTruthy();
    expect(screen.getAllByText('120W').length).toBe(2);
    expect(screen.getByText('80W')).toBeTruthy();
    expect(screen.getByText('MinerAlpha')).toBeTruthy();
    expect(screen.getByText('MinerBeta')).toBeTruthy();
    expect(screen.queryByText('Offline')).toBeNull();
  });

  it('renders empty state when there are no miners', async () => {
    await render(<PowerUsageChart miners={[]} />);
    expect(screen.getByText('analytics.notEnoughData')).toBeTruthy();
    expect(screen.getByText('analytics.power')).toBeTruthy();
  });

  it('renders empty state when all miners are offline', async () => {
    await render(<PowerUsageChart miners={[offline('m1', 'Offline', 100)]} />);
    expect(screen.getByText('analytics.notEnoughData')).toBeTruthy();
  });

  it('renders with null status data', async () => {
    const noStatus = {
      id: 'm1',
      name: 'Miner',
      ip: '10.0.0.1',
      port: 80,
      isOnline: true,
      status: null,
    };
    await render(<PowerUsageChart miners={[noStatus]} />);
    expect(screen.getAllByText('0W').length).toBe(3);
    expect(screen.getByText('1W')).toBeTruthy();
    expect(screen.getByText('Miner')).toBeTruthy();
  });

  it('renders correct number of data points for online miners', async () => {
    await render(
      <PowerUsageChart
        miners={[
          online('m1', 'A', 10),
          online('m2', 'B', 20),
          online('m3', 'C', 30),
          online('m4', 'D', 40),
        ]}
      />,
    );
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
    expect(screen.getByText('C')).toBeTruthy();
    expect(screen.getByText('D')).toBeTruthy();
  });

  it('limits bars to the first 5 online miners', async () => {
    const miners = [1, 2, 3, 4, 5, 6].map((n) => online(`m${n}`, `M${n}`, n));
    await render(<PowerUsageChart miners={miners} />);
    expect(screen.getByText('M1')).toBeTruthy();
    expect(screen.getByText('M5')).toBeTruthy();
    expect(screen.queryByText('M6')).toBeNull();
  });

  it('renders with a single online miner', async () => {
    await render(<PowerUsageChart miners={[online('m1', 'Solo', 60)]} />);
    expect(screen.getAllByText('60W').length).toBe(4);
    expect(screen.getByText('Solo')).toBeTruthy();
  });
});
