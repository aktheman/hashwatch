import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('renders children when no error', async () => {
  await render(
    <ErrorBoundary>
      <Text>Hello</Text>
    </ErrorBoundary>,
  );
  expect(screen.getByText('Hello')).toBeTruthy();
});

it('renders Try Again button after error', async () => {
  function Bomb(): React.ReactElement {
    throw new Error('Kaboom');
  }

  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  const r = await render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  );

  expect(r.getByText('errorBoundary.tryAgain')).toBeTruthy();
  expect(consoleSpy).toHaveBeenCalled();
});
