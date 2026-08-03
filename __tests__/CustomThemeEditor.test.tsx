import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react-native';
import React from 'react';
import { Alert, Platform } from 'react-native';
import CustomThemeEditor from '../src/screens/CustomThemeEditor';

jest.mock('../src/theme', () => {
  const darkPalette = {
    bg: '#0a0a0f',
    surface: '#12121a',
    surfaceLight: '#1a1a24',
    border: '#2a2940',
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
    text: '#e2e0ff',
    textDim: '#9694b0',
    textMuted: '#6b6990',
    glow: '#6c63ff',
    glowSuccess: '#22c55e',
    glowDanger: '#ef4444',
    glowWarning: '#f59e0b',
  };
  const neonPalette = {
    ...darkPalette,
    bg: '#08080f',
    primary: '#00ffff',
  };
  return {
    useTheme: () => darkPalette,
    darkTheme: darkPalette,
    THEME_MAP: { dark: darkPalette, neon: neonPalette },
    buildThemeFromColors: (colors: any) => ({ ...darkPalette, ...colors }),
  };
});

const mockThemes: any[] = [];
const mockCreate = jest.fn().mockResolvedValue(null);
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockRemove = jest.fn().mockResolvedValue(undefined);

jest.mock('../src/store/customThemes', () => ({
  useCustomThemesStore: (selector?: any) => {
    const state = {
      themes: mockThemes,
      create: mockCreate,
      update: mockUpdate,
      remove: mockRemove,
    };
    return selector ? selector(state) : state;
  },
  customThemeToTheme: (ct: any) => ct.colors,
}));

jest.mock('../src/components/ThemePreviewModal', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');
  return {
    ThemePreviewModal: (props: any) =>
      props.visible
        ? React.createElement(
            View,
            null,
            React.createElement(Text, null, props.themeName),
            React.createElement(
              Pressable,
              {
                accessibilityRole: 'button',
                accessibilityLabel: `Apply ${props.themeName} theme`,
                onPress: props.onApply,
              },
              React.createElement(Text, null, 'Apply'),
            ),
            React.createElement(
              Pressable,
              {
                accessibilityRole: 'button',
                accessibilityLabel: 'Close preview',
                onPress: props.onClose,
              },
              React.createElement(Text, null, 'Close'),
            ),
          )
        : null,
  };
});

const mockGoBack = jest.fn();
const mockNavigation = { navigate: jest.fn(), goBack: mockGoBack };
const existingTheme = {
  id: 1,
  name: 'My Custom',
  colors: { bg: '#101010', surface: '#12121a' },
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

function captureAlertButtons() {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons?: any[]) => {
    (alertSpy as any).__buttons = buttons ?? [];
  });
  return alertSpy;
}

function setWebClipboard(clipboard: unknown): () => void {
  const original = Object.getOwnPropertyDescriptor(global, 'navigator');
  Object.defineProperty(global, 'navigator', {
    value: { clipboard },
    configurable: true,
    writable: true,
  });
  return () => {
    if (original) {
      Object.defineProperty(global, 'navigator', original);
    } else {
      delete (global as any).navigator;
    }
  };
}

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
  mockThemes.length = 0;
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('renders the new theme title for a fresh theme', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  expect(screen.getByText('themes.newTheme')).toBeTruthy();
  expect(screen.getByLabelText('themes.createTheme')).toBeTruthy();
  expect(screen.queryByLabelText('themes.deleteTheme')).toBeNull();
});

it('renders edit mode for an existing theme', async () => {
  mockThemes.push(existingTheme);
  await render(
    <CustomThemeEditor navigation={mockNavigation as any} route={{ params: { themeId: 1 } }} />,
  );
  expect(screen.getByText('themes.editTheme')).toBeTruthy();
  expect(screen.getByLabelText('themes.saveChanges')).toBeTruthy();
  expect(screen.getByLabelText('themes.deleteTheme')).toBeTruthy();
  expect(screen.getByLabelText('themes.themeName').props.value).toBe('My Custom');
});

it('clones colors from a built-in theme', async () => {
  await render(
    <CustomThemeEditor
      navigation={mockNavigation as any}
      route={{ params: { cloneFrom: 'neon' } }}
    />,
  );
  expect(screen.getByLabelText('customThemeEditor.colors.bg color hex value').props.value).toBe(
    '#08080f',
  );
});

it('shows theme name input', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  expect(screen.getByPlaceholderText('themes.themeNamePlaceholder')).toBeTruthy();
});

it('shows export, preview and reset header buttons', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  expect(screen.getByLabelText('themes.export')).toBeTruthy();
  expect(screen.getByLabelText('themes.preview')).toBeTruthy();
  expect(screen.getByLabelText('themes.resetColors')).toBeTruthy();
});

it('shows all color group tabs', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  expect(screen.getByLabelText('customThemeEditor.background')).toBeTruthy();
  expect(screen.getByLabelText('customThemeEditor.primary')).toBeTruthy();
  expect(screen.getByLabelText('customThemeEditor.status')).toBeTruthy();
  expect(screen.getByLabelText('customThemeEditor.text')).toBeTruthy();
  expect(screen.getByLabelText('customThemeEditor.glow')).toBeTruthy();
});

it('switches between color group tabs', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  await fireEvent.press(screen.getByLabelText('customThemeEditor.glow'));
  expect(screen.getByLabelText('customThemeEditor.colors.glow color hex value')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('customThemeEditor.primary'));
  expect(screen.getByLabelText('customThemeEditor.colors.primary color hex value')).toBeTruthy();
});

it('updates a color value when the hex input changes', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  const bgInput = screen.getByLabelText('customThemeEditor.colors.bg color hex value');
  await fireEvent.changeText(bgInput, '#101010');
  await waitFor(() => {
    expect(screen.getByLabelText('customThemeEditor.colors.bg color hex value').props.value).toBe(
      '#101010',
    );
  });
});

it('shows alert on save with an empty name', async () => {
  const alertSpy = captureAlertButtons();
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  await fireEvent.press(screen.getByLabelText('themes.createTheme'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('common.error', 'customThemeEditor.nameRequired');
  });
});

it('shows alert on save with an invalid hex color', async () => {
  const alertSpy = captureAlertButtons();
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  await fireEvent.changeText(screen.getByLabelText('themes.themeName'), 'My Theme');
  await fireEvent.changeText(
    screen.getByLabelText('customThemeEditor.colors.bg color hex value'),
    'zzz',
  );
  await fireEvent.press(screen.getByLabelText('themes.createTheme'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith(
      'customThemeEditor.invalidColors',
      'themes.invalidColors',
    );
  });
});

it('creates a new theme and navigates back', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  await fireEvent.changeText(screen.getByLabelText('themes.themeName'), 'My Theme');
  await fireEvent.changeText(
    screen.getByLabelText('customThemeEditor.colors.bg color hex value'),
    '#101010',
  );
  await fireEvent.press(screen.getByLabelText('themes.createTheme'));
  await waitFor(() => {
    expect(mockCreate).toHaveBeenCalledWith('My Theme', expect.objectContaining({ bg: '#101010' }));
  });
  expect(mockGoBack).toHaveBeenCalled();
});

it('updates an existing theme and navigates back', async () => {
  mockThemes.push(existingTheme);
  await render(
    <CustomThemeEditor navigation={mockNavigation as any} route={{ params: { themeId: 1 } }} />,
  );
  await fireEvent.press(screen.getByLabelText('themes.saveChanges'));
  await waitFor(() => {
    expect(mockUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'My Custom' }));
  });
  expect(mockGoBack).toHaveBeenCalled();
});

it('deletes an existing theme after confirmation', async () => {
  mockThemes.push(existingTheme);
  const alertSpy = captureAlertButtons();
  await render(
    <CustomThemeEditor navigation={mockNavigation as any} route={{ params: { themeId: 1 } }} />,
  );
  await fireEvent.press(screen.getByLabelText('themes.deleteTheme'));
  await act(async () => {
    alertSpy.__buttons[1].onPress();
  });
  await waitFor(() => {
    expect(mockRemove).toHaveBeenCalledWith(1);
  });
  expect(mockGoBack).toHaveBeenCalled();
});

it('does not show a delete button for new themes', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  expect(screen.queryByLabelText('themes.deleteTheme')).toBeNull();
});

it('resets colors back to the base theme', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  const bgInput = screen.getByLabelText('customThemeEditor.colors.bg color hex value');
  await fireEvent.changeText(bgInput, '#ffffff');
  await waitFor(() => {
    expect(screen.getByLabelText('customThemeEditor.colors.bg color hex value').props.value).toBe(
      '#ffffff',
    );
  });
  await fireEvent.press(screen.getByLabelText('themes.resetColors'));
  await waitFor(() => {
    expect(screen.getByLabelText('customThemeEditor.colors.bg color hex value').props.value).toBe(
      '#0a0a0f',
    );
  });
});

it('exports the theme JSON to the clipboard on web', async () => {
  const origOS = (Platform as any).OS;
  const writeText = jest.fn().mockResolvedValue(undefined);
  const restoreNav = setWebClipboard({ writeText });
  (Platform as any).OS = 'web';
  const alertSpy = captureAlertButtons();
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  await fireEvent.changeText(screen.getByLabelText('themes.themeName'), 'Neon');
  await fireEvent.press(screen.getByLabelText('themes.export'));
  await waitFor(() => {
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Neon'));
  });
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('common.success', 'customThemeEditor.copied');
  });
  (Platform as any).OS = origOS;
  restoreNav();
});

it('falls back to a JSON alert when clipboard write fails on web', async () => {
  const origOS = (Platform as any).OS;
  const restoreNav = setWebClipboard({
    writeText: jest.fn().mockRejectedValue(new Error('denied')),
  });
  (Platform as any).OS = 'web';
  const alertSpy = captureAlertButtons();
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  await fireEvent.press(screen.getByLabelText('themes.export'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith(
      'customThemeEditor.export',
      expect.stringContaining('Custom Theme'),
    );
  });
  (Platform as any).OS = origOS;
  restoreNav();
});

it('exports the theme JSON via alert on native', async () => {
  const alertSpy = captureAlertButtons();
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  await fireEvent.changeText(screen.getByLabelText('themes.themeName'), 'Ocean');
  await fireEvent.press(screen.getByLabelText('themes.export'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith(
      'customThemeEditor.exportTitle',
      expect.stringContaining('Ocean'),
    );
  });
});

it('opens the preview modal and applies the theme', async () => {
  const alertSpy = captureAlertButtons();
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  await fireEvent.press(screen.getByLabelText('themes.preview'));
  expect(screen.getByLabelText('Apply themes.preview theme')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Apply themes.preview theme'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('common.error', 'customThemeEditor.nameRequired');
  });
});

it('closes the preview modal', async () => {
  await render(<CustomThemeEditor navigation={mockNavigation as any} />);
  await fireEvent.press(screen.getByLabelText('themes.preview'));
  expect(screen.getByLabelText('Close preview')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Close preview'));
  await waitFor(() => {
    expect(screen.queryByLabelText('Close preview')).toBeNull();
  });
});
