import { render, cleanup } from '@testing-library/react-native';
import React from 'react';
import { Skeleton } from '../src/components/Skeleton';
import { SkeletonCard } from '../src/components/SkeletonCard';
import { setTheme, darkTheme } from '../src/theme';

beforeEach(() => {
  cleanup();
  setTheme(darkTheme);
});

it('renders Skeleton with default props', async () => {
  const tree = await render(<Skeleton />);
  expect(tree.toJSON()).toBeTruthy();
});

it('renders Skeleton with custom props', async () => {
  const tree = await render(<Skeleton width={200} height={24} borderRadius={12} />);
  expect(tree.toJSON()).toBeTruthy();
});

it('renders SkeletonCard with default 3 rows', async () => {
  const tree = await render(<SkeletonCard />);
  const json = tree.toJSON() as any;
  const children = json.children;
  expect(children.length).toBe(4);
});

it('renders SkeletonCard with custom row count', async () => {
  const tree = await render(<SkeletonCard rows={5} />);
  const json = tree.toJSON() as any;
  const children = json.children;
  expect(children.length).toBe(6);
});
