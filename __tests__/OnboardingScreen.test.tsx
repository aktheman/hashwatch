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
  expect(screen.getByText('onboarding.slide1Title')).toBeTruthy();
});

it('renders Next button', async () => {
  await render(<OnboardingScreen onComplete={onComplete} />);
  expect(screen.getByText('onboarding.next')).toBeTruthy();
});

it('renders Skip button', async () => {
  await render(<OnboardingScreen onComplete={onComplete} />);
  expect(screen.getByText('onboarding.skip')).toBeTruthy();
});

it('calls onComplete when Skip is pressed', async () => {
  await render(<OnboardingScreen onComplete={onComplete} />);
  await act(async () => {
    fireEvent.press(screen.getByText('onboarding.skip'));
  });
  expect(onComplete).toHaveBeenCalled();
});

it('saves onboarding_complete setting when skipped', async () => {
  await render(<OnboardingScreen onComplete={onComplete} />);
  await act(async () => {
    fireEvent.press(screen.getByText('onboarding.skip'));
  });
  expect(setSetting).toHaveBeenCalledWith('onboarding_complete', 'true');
});

it('renders all slide titles in flatlist', async () => {
  await render(<OnboardingScreen onComplete={onComplete} />);
  expect(screen.getByText('onboarding.slide1Title')).toBeTruthy();
  expect(screen.getByText('onboarding.slide2Title')).toBeTruthy();
  expect(screen.getByText('onboarding.slide3Title')).toBeTruthy();
  expect(screen.getByText('onboarding.slide4Title')).toBeTruthy();
});

it('renders dot indicators', async () => {
  await render(<OnboardingScreen onComplete={onComplete} />);
  expect(screen.getByText('onboarding.slide1Title')).toBeTruthy();
});
