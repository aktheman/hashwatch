import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StatWidget } from '../src/components/StatWidget';
import { setTheme, darkTheme } from '../src/theme';

jest.setTimeout(15000);

beforeEach(() => {
  setTheme(darkTheme);
});

it('renders label and value', async () => {
  await render(<StatWidget label="Hashrate" value="100 TH/s" />);
  expect(screen.getByText('Hashrate')).toBeTruthy();
  expect(screen.getByText('100 TH/s')).toBeTruthy();
});

it('renders with trend indicator when provided', async () => {
  await render(<StatWidget label="Temp" value="65°C" trend="up" />);
  expect(screen.getByText('Temp')).toBeTruthy();
  expect(screen.getByText('65°C')).toBeTruthy();
});

it('renders with icon when provided', async () => {
  await render(<StatWidget label="Hashrate" value="100 TH/s" icon="⬡" />);
  expect(screen.getByText('⬡')).toBeTruthy();
});
