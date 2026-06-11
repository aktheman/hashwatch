import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { ErrorBanner } from '../src/components/ErrorBanner';

it('renders error message', async () => {
  await render(<ErrorBanner message="Something went wrong" onDismiss={jest.fn()} />);
  expect(screen.getByText('Something went wrong')).toBeTruthy();
});

it('calls onDismiss when dismiss button pressed', async () => {
  const onDismiss = jest.fn();
  await render(<ErrorBanner message="Test error" onDismiss={onDismiss} />);
  fireEvent.press(screen.getByText('✕'));
  expect(onDismiss).toHaveBeenCalled();
});
