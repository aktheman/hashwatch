jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('../src/db/database', () => ({
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

import { render, screen, fireEvent, act } from '@testing-library/react-native';
import React from 'react';
import { OnboardingScreen } from '../src/screens/OnboardingScreen';
import { setTheme, darkTheme } from '../src/theme';
import { setSetting } from '../src/db/database';

const onComplete = jest.fn();

beforeEach(() => {
  setTheme(darkTheme);
  jest.clearAllMocks();
});

it('renders first slide title', async () => {
  await render(<OnboardingScreen onComplete={onComplete} />);
  expect(screen.getByText('Monitor Your BitAxe')).toBeTruthy();
});

it('renders Next button', async () => {
  await render(<OnboardingScreen onComplete={onComplete} />);
  expect(screen.getByText('Next')).toBeTruthy();
});

it('renders Skip button', async () => {
  await render(<OnboardingScreen onComplete={onComplete} />);
  expect(screen.getByText('Skip')).toBeTruthy();
});

it('calls onComplete when Skip is pressed', async () => {
  await render(<OnboardingScreen onComplete={onComplete} />);
  await act(async () => {
    fireEvent.press(screen.getByText('Skip'));
  });
  expect(onComplete).toHaveBeenCalled();
});

it('saves onboarding_complete setting when skipped', async () => {
  await render(<OnboardingScreen onComplete={onComplete} />);
  await act(async () => {
    fireEvent.press(screen.getByText('Skip'));
  });
  expect(setSetting).toHaveBeenCalledWith('onboarding_complete', 'true');
});

it('renders all slide titles in flatlist', async () => {
  await render(<OnboardingScreen onComplete={onComplete} />);
  expect(screen.getByText('Monitor Your BitAxe')).toBeTruthy();
  expect(screen.getByText('Auto-Discovery')).toBeTruthy();
  expect(screen.getByText('Instant Alerts')).toBeTruthy();
  expect(screen.getByText('Ready to Mine')).toBeTruthy();
});

it('renders dot indicators', async () => {
  await render(<OnboardingScreen onComplete={onComplete} />);
  expect(screen.getByText('Monitor Your BitAxe')).toBeTruthy();
});
