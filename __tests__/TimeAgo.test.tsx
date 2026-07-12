import { render, act, cleanup } from '@testing-library/react-native';
import React from 'react';
import { TimeAgo } from '../src/components/TimeAgo';

beforeEach(() => {
  cleanup();
  jest.useRealTimers();
});

it('renders null when timestamp is null', async () => {
  const tree = await render(<TimeAgo timestamp={null} />);
  expect(tree.toJSON()).toBeNull();
});

it('renders elapsed time as Xs ago', async () => {
  const now = Date.now();
  const tree = await render(<TimeAgo timestamp={now - 10000} />);
  expect(tree.getByText('10common.secondsAgo')).toBeTruthy();
});

it('renders 0s ago for current timestamp', async () => {
  const tree = await render(<TimeAgo timestamp={Date.now()} />);
  expect(tree.getByText('0common.secondsAgo')).toBeTruthy();
});

it('updates text as time passes', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  const fiveSecAgo = Date.now() - 5000;
  const tree = await render(<TimeAgo timestamp={fiveSecAgo} />);
  expect(tree.getByText('5common.secondsAgo')).toBeTruthy();

  await act(() => {
    jest.advanceTimersByTime(4000);
  });
  expect(tree.getByText('9common.secondsAgo')).toBeTruthy();
});

it('applies custom style', async () => {
  const style = { color: 'red', fontSize: 14 };
  const tree = await render(<TimeAgo timestamp={Date.now() - 5000} style={style} />);
  expect(tree.getByText('5common.secondsAgo')).toBeTruthy();
});
