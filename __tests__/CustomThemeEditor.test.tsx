import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import CustomThemeEditor from '../src/screens/CustomThemeEditor';

jest.mock('../src/theme', () => {
  const darkTheme = {
    bg: '#0a0a0f',
    surface: '#12121a',
    surfaceLight: '#1a1a24',
    border: '#2a2940',
    text: '#e2e0ff',
    textDim: '#9694b0',
    textMuted: '#6b6990',
    primary: '#6c63ff',
    primaryLight: '#8b85ff',
    primaryDark: '#5a52d5',
    accent: '#6c63ff',
    success: '#22c55e',
    successLight: '#34d574',
    danger: '#ef4444',
    dangerLight: '#f87171',
    warning: '#f59e0b',
    warningLight: '#fbbf24',
    info: '#06b6d4',
    glow: '#6c63ff33',
    glowSuccess: '#22c55e33',
    glowDanger: '#ef444433',
    glowWarning: '#f59e0b33',
  };
  return {
    useTheme: () => ({
      bg: '#0a0a0f',
      surface: '#12121a',
      surfaceLight: '#1a1a24',
      border: '#2a2940',
      text: '#e2e0ff',
      textDim: '#9694b0',
      textMuted: '#6b6990',
      primary: '#6c63ff',
      primaryLight: '#8b85ff',
      primaryDark: '#5a52d5',
      accent: '#6c63ff',
      success: '#22c55e',
      successLight: '#34d574',
      danger: '#ef4444',
      dangerLight: '#f87171',
      warning: '#f59e0b',
      warningLight: '#fbbf24',
      info: '#06b6d4',
      glow: '#6c63ff33',
      glowSuccess: '#22c55e33',
      glowDanger: '#ef444433',
      glowWarning: '#f59e0b33',
    }),
    darkTheme,
    THEME_MAP: { dark: darkTheme },
    buildThemeFromColors: (colors: any) => ({ ...darkTheme, ...colors }),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
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

jest.mock('../src/store/customThemes', () => ({
  useCustomThemesStore: Object.assign(
    (selector?: any) => {
      const state = {
        themes: [],
        create: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
      };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ themes: [], create: jest.fn(), update: jest.fn(), remove: jest.fn() }) },
  ),
  customThemeToTheme: (ct: any) => ct.colors,
}));

jest.mock('../src/components/ThemePreviewModal', () => ({
  ThemePreviewModal: () => null,
}));

const mockGoBack = jest.fn();
const mockNavigation = { navigate: jest.fn(), goBack: mockGoBack };

beforeEach(() => {
  jest.clearAllMocks();
});

it('renders the editor title for new theme', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  expect(screen.getByText('themes.newTheme')).toBeTruthy();
});

it('shows theme name input', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  expect(screen.getByPlaceholderText('themes.themeNamePlaceholder')).toBeTruthy();
});

it('shows create theme button', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  expect(screen.getByLabelText('themes.createTheme')).toBeTruthy();
});

it('shows export and preview buttons', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  expect(screen.getByLabelText('themes.export')).toBeTruthy();
  expect(screen.getByLabelText('themes.preview')).toBeTruthy();
});

it('shows reset button', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  expect(screen.getByLabelText('themes.resetColors')).toBeTruthy();
});

it('shows color group tabs', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  expect(screen.getByText('customThemeEditor.background')).toBeTruthy();
  expect(screen.getByText('customThemeEditor.primary')).toBeTruthy();
  expect(screen.getByText('customThemeEditor.status')).toBeTruthy();
});

it('switches color group tab', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  await fireEvent.press(screen.getByText('customThemeEditor.text'));
  expect(screen.getByText('customThemeEditor.text')).toBeTruthy();
});

it('shows alert on save with empty name', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  await fireEvent.press(screen.getByLabelText('themes.createTheme'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalled();
  });
  alertSpy.mockRestore();
});
