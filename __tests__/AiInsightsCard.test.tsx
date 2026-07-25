import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AiInsightsCard, AiInsight } from '../src/components/AiInsightsCard';
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
      success: '#10B981',
      danger: '#EF4444',
      info: '#06B6D4',
    }),
  };
});

jest.setTimeout(15000);

beforeEach(() => {
  setTheme(darkTheme);
});

it('renders empty state when no insights', async () => {
  await render(<AiInsightsCard insights={[]} />);
  expect(screen.getByText('aiInsights.title')).toBeTruthy();
  expect(screen.getByText('aiInsights.empty')).toBeTruthy();
});

it('renders recommendation insights', async () => {
  const insights: AiInsight[] = [
    {
      type: 'recommendation',
      title: 'Upgrade pool',
      description: 'Switch to a better pool',
      impact: 'High',
    },
  ];
  await render(<AiInsightsCard insights={insights} />);
  expect(screen.getByText('Upgrade pool')).toBeTruthy();
  expect(screen.getByText('Switch to a better pool')).toBeTruthy();
  expect(screen.getByText('High')).toBeTruthy();
});

it('renders warning insights', async () => {
  const insights: AiInsight[] = [
    {
      type: 'warning',
      title: 'High temp',
      description: 'Miner is overheating',
      impact: 'Critical',
    },
  ];
  await render(<AiInsightsCard insights={insights} />);
  expect(screen.getByText('High temp')).toBeTruthy();
  expect(screen.getByText('Miner is overheating')).toBeTruthy();
});

it('renders optimization insights', async () => {
  const insights: AiInsight[] = [
    {
      type: 'optimization',
      title: 'Lower voltage',
      description: 'Reduce voltage for efficiency',
      impact: 'Medium',
    },
  ];
  await render(<AiInsightsCard insights={insights} />);
  expect(screen.getByText('Lower voltage')).toBeTruthy();
  expect(screen.getByText('Reduce voltage for efficiency')).toBeTruthy();
});

it('renders multiple insights', async () => {
  const insights: AiInsight[] = [
    { type: 'recommendation', title: 'Pool swap', description: 'Try a new pool', impact: 'Low' },
    { type: 'warning', title: 'Fan issue', description: 'Fan RPM low', impact: 'Medium' },
    { type: 'optimization', title: 'Overclock', description: 'Increase frequency', impact: 'High' },
  ];
  await render(<AiInsightsCard insights={insights} />);
  expect(screen.getByText('Pool swap')).toBeTruthy();
  expect(screen.getByText('Fan issue')).toBeTruthy();
  expect(screen.getByText('Overclock')).toBeTruthy();
});
