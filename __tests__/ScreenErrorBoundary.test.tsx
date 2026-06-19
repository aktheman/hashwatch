import { render, screen, fireEvent, cleanup } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { ScreenErrorBoundary } from '../src/components/ScreenErrorBoundary';
import { setTheme, darkTheme } from '../src/theme';

beforeEach(() => {
  cleanup();
  setTheme(darkTheme);
});

function GoodChild() {
  return <Text>OK</Text>;
}

function BadChild() {
  throw new Error('Boom');
}

it('renders children when no error', async () => {
  await render(
    <ScreenErrorBoundary>
      <GoodChild />
    </ScreenErrorBoundary>,
  );
  expect(screen.getByText('OK')).toBeTruthy();
});

it('renders error UI when child throws', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  await render(
    <ScreenErrorBoundary>
      <BadChild />
    </ScreenErrorBoundary>,
  );
  expect(screen.getByText('errorBoundary.screenError')).toBeTruthy();
  expect(screen.getByText('Boom')).toBeTruthy();
  spy.mockRestore();
});

it('retry button exists and is pressable', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  await render(
    <ScreenErrorBoundary>
      <BadChild />
    </ScreenErrorBoundary>,
  );
  expect(screen.getByText('errorBoundary.screenError')).toBeTruthy();
  const retryBtn = screen.getByLabelText('errorBoundary.tryAgain');
  expect(retryBtn).toBeTruthy();
  fireEvent.press(retryBtn);
  spy.mockRestore();
});

it('go back button calls onGoBack', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const onGoBack = jest.fn();
  await render(
    <ScreenErrorBoundary onGoBack={onGoBack}>
      <BadChild />
    </ScreenErrorBoundary>,
  );
  fireEvent.press(screen.getByLabelText('common.goBack'));
  expect(onGoBack).toHaveBeenCalled();
  spy.mockRestore();
});
