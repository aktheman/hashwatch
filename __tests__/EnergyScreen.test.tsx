import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { EnergyScreen } from '../src/screens/EnergyScreen';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a0f',
    surface: '#12121a',
    text: '#e2e0ff',
    textDim: '#9694b0',
    primary: '#6c63ff',
    primaryDark: '#5a52d5',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    border: '#2a2940',
    surfaceLight: '#1a1a24',
    textMuted: '#6b6990',
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

jest.mock('../src/utils/haptics', () => ({
  light: jest.fn(),
  medium: jest.fn(),
  heavy: jest.fn(),
  success: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  selection: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

it('renders the screen title', async () => {
  await render(<EnergyScreen />);
  expect(screen.getByText('energy.title')).toBeTruthy();
});

it('shows default energy sources', async () => {
  await render(<EnergyScreen />);
  expect(screen.getByText('Grid Power')).toBeTruthy();
  expect(screen.getByText('Solar Panels')).toBeTruthy();
});

it('shows energy stats card', async () => {
  await render(<EnergyScreen />);
  expect(screen.getByText('energy.totalKwh')).toBeTruthy();
  expect(screen.getByText('energy.renewablePercent')).toBeTruthy();
  expect(screen.getByText('energy.gridPercent')).toBeTruthy();
  expect(screen.getByText('energy.carbonSaved')).toBeTruthy();
  expect(screen.getByText('energy.estimatedCost')).toBeTruthy();
});

it('shows add source button', async () => {
  await render(<EnergyScreen />);
  expect(screen.getByLabelText('Add energy source')).toBeTruthy();
});

it('opens add source modal', async () => {
  await render(<EnergyScreen />);
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Add energy source'));
  });
  await waitFor(() => {
    expect(screen.getByText('energy.addSource')).toBeTruthy();
  });
});

it('opens add reading modal', async () => {
  await render(<EnergyScreen />);
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Log power reading'));
  });
  await waitFor(() => {
    expect(screen.getAllByText('energy.addReading').length).toBeGreaterThanOrEqual(1);
  });
});

it('cancels add source modal', async () => {
  await render(<EnergyScreen />);
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Add energy source'));
  });
  await waitFor(() => {
    expect(screen.getByText('energy.addSource')).toBeTruthy();
  });
  await act(async () => {
    fireEvent.press(screen.getByText('common.cancel'));
  });
});

it('shows source max watts', async () => {
  await render(<EnergyScreen />);
  expect(screen.getByText('5000W')).toBeTruthy();
  expect(screen.getByText('3000W')).toBeTruthy();
});
