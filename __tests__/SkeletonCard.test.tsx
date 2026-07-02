import { render, cleanup } from '@testing-library/react-native';
import React from 'react';
import { SkeletonCard } from '../src/components/SkeletonCard';
import { setTheme, darkTheme } from '../src/theme';

beforeEach(() => {
  cleanup();
  setTheme(darkTheme);
});

it('renders with default 3 rows', async () => {
  const tree = await render(<SkeletonCard />);
  const json = tree.toJSON() as any;
  expect(json).toBeTruthy();
  expect(json.children.length).toBeGreaterThanOrEqual(1);
});

it('renders with custom row count', async () => {
  const tree = await render(<SkeletonCard rows={5} />);
  expect(tree.toJSON()).toBeTruthy();
});

it('renders with 0 rows', async () => {
  const tree = await render(<SkeletonCard rows={0} />);
  expect(tree.toJSON()).toBeTruthy();
});

it('renders with 1 row', async () => {
  const tree = await render(<SkeletonCard rows={1} />);
  expect(tree.toJSON()).toBeTruthy();
});
