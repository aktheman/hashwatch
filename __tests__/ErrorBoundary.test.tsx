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

  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

  await render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  );

  expect(consoleError).toHaveBeenCalled();
  expect(screen.getByText('Try Again')).toBeTruthy();
});
