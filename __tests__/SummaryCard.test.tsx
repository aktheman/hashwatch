import { render, cleanup } from '@testing-library/react-native';
import React from 'react';
import { SummaryCard } from '../src/components/SummaryCard';
import { setTheme, darkTheme } from '../src/theme';

beforeEach(() => {
  cleanup();
  setTheme(darkTheme);
});

it('renders icon, value, and label', async () => {
  const tree = await render(<SummaryCard icon="⚡" value="500" label="Hashrate" />);
  expect(tree.getByText('⚡')).toBeTruthy();
  expect(tree.getByText('500')).toBeTruthy();
  expect(tree.getByText('Hashrate')).toBeTruthy();
});

it('renders with custom color', async () => {
  const tree = await render(<SummaryCard icon="🟢" value="10" label="Online" color="#10B981" />);
  expect(tree.toJSON()).toBeTruthy();
});

it('renders accent bar when accent is true', async () => {
  const tree = await render(<SummaryCard icon="⚡" value="500" label="Hashrate" accent />);
  expect(tree.toJSON()).toBeTruthy();
});

it('renders without accent bar by default', async () => {
  const tree = await render(<SummaryCard icon="⚡" value="500" label="Hashrate" />);
  expect(tree.toJSON()).toBeTruthy();
});
