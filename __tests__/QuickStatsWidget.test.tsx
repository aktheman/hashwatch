import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { QuickStatsWidget } from '../src/components/QuickStatsWidget';
import { setTheme, darkTheme } from '../src/theme';

jest.mock('../src/theme', () => {
  const actual = jest.requireActual('../src/theme');
  return {
    ...actual,
    useTheme: () => ({
      surface: '#13132B',
      border: '#1E1E42',
      text: '#FFFFFF',
      textDim: '#8B8FA3',
      textMuted: '#5C5F7A',
      primary: '#6C63FF',
      accent: '#3B82F6',
      success: '#10B981',
      danger: '#EF4444',
      warning: '#F59E0B',
    }),
  };
});

jest.setTimeout(15000);

beforeEach(() => {
  setTheme(darkTheme);
});

it('renders all 4 stat tiles', async () => {
  await render(
    <QuickStatsWidget
      hashrate="500 GH/s"
      temperature={55}
      power={120}
      miners={{ online: 3, total: 4 }}
    />,
  );
  expect(screen.getByText('Hashrate')).toBeTruthy();
  expect(screen.getByText('Temp')).toBeTruthy();
  expect(screen.getByText('Power')).toBeTruthy();
  expect(screen.getByText('Miners')).toBeTruthy();
});

it('shows correct values', async () => {
  await render(
    <QuickStatsWidget
      hashrate="1.2 TH/s"
      temperature={72}
      power={250}
      miners={{ online: 5, total: 8 }}
    />,
  );
  expect(screen.getByText('1.2 TH/s')).toBeTruthy();
  expect(screen.getByText('72°C')).toBeTruthy();
  expect(screen.getByText('250W')).toBeTruthy();
  expect(screen.getByText('5/8')).toBeTruthy();
});

it('shows green for low temp', async () => {
  const { getByText } = await render(
    <QuickStatsWidget
      hashrate="500 GH/s"
      temperature={55}
      power={120}
      miners={{ online: 1, total: 1 }}
    />,
  );
  const tempValue = getByText('55°C');
  expect(tempValue).toBeTruthy();
  const style = Array.isArray(tempValue.props.style)
    ? Object.assign({}, ...tempValue.props.style.filter(Boolean))
    : tempValue.props.style;
  expect(style.color).toBe('#10B981');
});

it('shows red for high temp', async () => {
  const { getByText } = await render(
    <QuickStatsWidget
      hashrate="500 GH/s"
      temperature={85}
      power={120}
      miners={{ online: 1, total: 1 }}
    />,
  );
  const tempValue = getByText('85°C');
  expect(tempValue).toBeTruthy();
  const style = Array.isArray(tempValue.props.style)
    ? Object.assign({}, ...tempValue.props.style.filter(Boolean))
    : tempValue.props.style;
  expect(style.color).toBe('#EF4444');
});

it('shows miners online/total', async () => {
  await render(
    <QuickStatsWidget
      hashrate="500 GH/s"
      temperature={60}
      power={120}
      miners={{ online: 7, total: 10 }}
    />,
  );
  expect(screen.getByText('7/10')).toBeTruthy();
});
