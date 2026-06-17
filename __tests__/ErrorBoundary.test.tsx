import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
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

  // Render without awaiting — React 19's act() can hang when error
  // boundaries catch synchronous render errors. The render work still
  // completes synchronously; we wait for the error UI via waitFor.
  render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  );

  await waitFor(() => {
    expect(screen.getByText('Try Again')).toBeTruthy();
  });

  expect(consoleSpy).toHaveBeenCalled();
});
