jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const state = { fills: [] as string[] };
  const Rect = (props: any) => {
    state.fills.push(props.fill);
    return React.createElement(View, { testID: 'heatmap-cell' });
  };
  (Rect as any).__state = state;
  const Svg = (props: any) => React.createElement(View, props);
  return {
    __esModule: true,
    default: Svg,
    Svg,
    Rect,
  };
});

import { render, screen, cleanup } from '@testing-library/react-native';
import React from 'react';
import { TemperatureHeatmap } from '../src/components/TemperatureHeatmap';
import { setTheme, darkTheme } from '../src/theme';

const { Rect } = jest.requireMock('react-native-svg') as any;

const miner = (id: string, name: string, temp: number | undefined, online = true): any => ({
  id,
  name,
  ip: '10.0.0.1',
  port: 80,
  isOnline: online,
  status: temp === undefined ? null : { hashRate: 100, hashRateUnit: 'GH/s', temperature: temp },
});

beforeEach(() => {
  cleanup();
  setTheme(darkTheme);
  Rect.__state.fills = [];
});

describe('TemperatureHeatmap', () => {
  it('renders heatmap with data and legend', async () => {
    await render(<TemperatureHeatmap miners={[miner('m1', 'MinerOne', 45)]} />);
    expect(screen.getByText('analytics.temperatureHistory')).toBeTruthy();
    expect(screen.getByText('<40°C')).toBeTruthy();
    expect(screen.getByText('40-55°C')).toBeTruthy();
    expect(screen.getByText('55-65°C')).toBeTruthy();
    expect(screen.getByText('65-75°C')).toBeTruthy();
    expect(screen.getByText('75-85°C')).toBeTruthy();
    expect(screen.getByText('>85°C')).toBeTruthy();
    expect(screen.getByText('MinerOne')).toBeTruthy();
    expect(screen.getAllByTestId('heatmap-cell').length).toBe(24);
  });

  it('renders empty state when there are no online miners', async () => {
    await render(<TemperatureHeatmap miners={[]} />);
    expect(screen.getByText('analytics.notEnoughData')).toBeTruthy();
    expect(screen.queryAllByTestId('heatmap-cell').length).toBe(0);
  });

  it('renders with a miner that has no temperature data', async () => {
    await render(<TemperatureHeatmap miners={[miner('m1', 'Miner', undefined)]} />);
    expect(screen.getByText('Miner')).toBeTruthy();
    expect(screen.getAllByTestId('heatmap-cell').length).toBe(24);
  });

  it('honors the hours prop for grid width', async () => {
    await render(<TemperatureHeatmap miners={[miner('m1', 'Miner', 45)]} hours={2} />);
    expect(screen.getAllByTestId('heatmap-cell').length).toBe(2);
  });

  it('caps the grid at 24 hours', async () => {
    await render(<TemperatureHeatmap miners={[miner('m1', 'Miner', 45)]} hours={48} />);
    expect(screen.getAllByTestId('heatmap-cell').length).toBe(24);
  });

  it('limits the heatmap to 8 online miners', async () => {
    const miners = Array.from({ length: 10 }, (_, i) => miner(`m${i}`, `Miner${i}`, 40 + i));
    await render(<TemperatureHeatmap miners={miners} />);
    expect(screen.getAllByTestId('heatmap-cell').length).toBe(8 * 24);
  });

  it('maps low temperatures to blue cells', async () => {
    await render(<TemperatureHeatmap miners={[miner('m1', 'Miner', 25)]} />);
    expect(Rect.__state.fills.length).toBe(24);
    expect(Rect.__state.fills.every((f: string) => f === '#3B82F6')).toBe(true);
  });

  it('maps high temperatures to red cells', async () => {
    await render(<TemperatureHeatmap miners={[miner('m1', 'Miner', 90)]} />);
    expect(Rect.__state.fills.length).toBe(24);
    expect(Rect.__state.fills.every((f: string) => f === '#EF4444' || f === '#DC2626')).toBe(true);
  });

  it('maps mid temperatures to green/orange cells', async () => {
    await render(<TemperatureHeatmap miners={[miner('m1', 'Miner', 55)]} />);
    expect(
      Rect.__state.fills.every((f: string) => ['#10B981', '#84CC16', '#F59E0B'].includes(f)),
    ).toBe(true);
  });
});
