import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { ThemeMarketplaceScreen } from '../src/screens/ThemeMarketplaceScreen';

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

const mockCreate = jest.fn().mockResolvedValue(null);
jest.mock('../src/store/customThemes', () => ({
  useCustomThemesStore: Object.assign(
    (selector?: any) => {
      const state = { create: mockCreate };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ create: mockCreate }) },
  ),
}));

jest.mock('../src/utils/themeShare', () => ({
  importThemeFromJSON: (text: string) => {
    try {
      const data = JSON.parse(text);
      if (data.name && data.colors) return data;
      return null;
    } catch {
      return null;
    }
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

it('renders the screen title', async () => {
  await render(<ThemeMarketplaceScreen />);
  expect(screen.getByText('Theme Marketplace')).toBeTruthy();
});

it('shows browse tab by default', async () => {
  await render(<ThemeMarketplaceScreen />);
  expect(screen.getByText('Browse')).toBeTruthy();
});

it('shows community themes', async () => {
  await render(<ThemeMarketplaceScreen />);
  expect(screen.getByText('Sunset')).toBeTruthy();
  expect(screen.getByText('Cyberpunk')).toBeTruthy();
  expect(screen.getByText('Deep Forest')).toBeTruthy();
  expect(screen.getByText('Solarized')).toBeTruthy();
});

it('shows install button for each theme', async () => {
  await render(<ThemeMarketplaceScreen />);
  const installButtons = screen.getAllByText('Install');
  expect(installButtons.length).toBeGreaterThanOrEqual(4);
});

it('shows preview button for each theme', async () => {
  await render(<ThemeMarketplaceScreen />);
  const previewButtons = screen.getAllByText('Preview');
  expect(previewButtons.length).toBeGreaterThanOrEqual(4);
});

it('shows share button for each theme', async () => {
  await render(<ThemeMarketplaceScreen />);
  const shareButtons = screen.getAllByText('Share');
  expect(shareButtons.length).toBeGreaterThanOrEqual(4);
});

it('switches to URL tab', async () => {
  await render(<ThemeMarketplaceScreen />);
  await act(async () => {
    fireEvent.press(screen.getByText('From URL'));
  });
  expect(screen.getByText('Import from URL')).toBeTruthy();
});

it('installs community theme on press', async () => {
  await render(<ThemeMarketplaceScreen />);
  await act(async () => {
    fireEvent.press(screen.getAllByText('Install')[0]);
  });
  expect(mockCreate).toHaveBeenCalled();
});

it('shows import from clipboard button', async () => {
  await render(<ThemeMarketplaceScreen />);
  expect(screen.getByText('Import from Clipboard')).toBeTruthy();
});
