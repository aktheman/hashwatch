import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { LiveActivityBadge } from '../src/components/LiveActivityBadge';
import { setTheme, darkTheme } from '../src/theme';

jest.setTimeout(15000);

beforeEach(() => {
  setTheme(darkTheme);
});

it('renders nothing when count is 0', async () => {
  const { toJSON } = await render(<LiveActivityBadge count={0} />);
  expect(toJSON()).toBeNull();
});

it('renders badge when count > 0', async () => {
  await render(<LiveActivityBadge count={3} />);
  expect(screen.getByText('3')).toBeTruthy();
});

it('shows correct count number', async () => {
  await render(<LiveActivityBadge count={42} />);
  expect(screen.getByText('42')).toBeTruthy();
});

it('has accessibility label', async () => {
  await render(<LiveActivityBadge count={5} />);
  expect(screen.getByLabelText('5 live activities')).toBeTruthy();
});
