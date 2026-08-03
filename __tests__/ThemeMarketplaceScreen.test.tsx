import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert, Share } from 'react-native';
import { ThemeMarketplaceScreen } from '../src/screens/ThemeMarketplaceScreen';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a0f',
    surface: '#12121a',
    surfaceLight: '#1a1a24',
    border: '#2a2940',
    text: '#e2e0ff',
    textDim: '#9694b0',
    textMuted: '#6b6990',
    primary: '#6c63ff',
    primaryDark: '#5a52d5',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
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
      const state = { create: (...args: unknown[]) => mockCreate(...args) };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ create: (...args: unknown[]) => mockCreate(...args) }) },
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

const VALID_THEME_JSON = JSON.stringify({
  name: 'Imported Theme',
  colors: { bg: '#111111', primary: '#222222' },
});

let alertSpy: jest.SpyInstance;
let shareSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: jest.fn().mockResolvedValue('{}'),
  });
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
});

afterEach(() => {
  alertSpy.mockRestore();
  shareSpy.mockRestore();
});

it('renders the screen title', async () => {
  await render(<ThemeMarketplaceScreen />);
  expect(screen.getByText('marketplace.themeTitle')).toBeTruthy();
});

it('shows browse tab by default', async () => {
  await render(<ThemeMarketplaceScreen />);
  expect(screen.getByText('marketplace.browse')).toBeTruthy();
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
  const buttons = screen.getAllByLabelText('marketplace.install');
  expect(buttons.length).toBeGreaterThanOrEqual(4);
});

it('shows preview button for each theme', async () => {
  await render(<ThemeMarketplaceScreen />);
  const buttons = screen.getAllByLabelText('marketplace.preview');
  expect(buttons.length).toBeGreaterThanOrEqual(4);
});

it('shows share button for each theme', async () => {
  await render(<ThemeMarketplaceScreen />);
  const buttons = screen.getAllByLabelText('marketplace.share');
  expect(buttons.length).toBeGreaterThanOrEqual(4);
});

it('shows import from clipboard button', async () => {
  await render(<ThemeMarketplaceScreen />);
  expect(screen.getByLabelText('marketplace.importFromClipboard')).toBeTruthy();
});

it('switches to URL tab', async () => {
  await render(<ThemeMarketplaceScreen />);
  await fireEvent.press(screen.getByLabelText('marketplace.fromUrl'));
  expect(screen.getByText('marketplace.importFromUrl')).toBeTruthy();
});

it('does not import when the URL is empty', async () => {
  await render(<ThemeMarketplaceScreen />);
  await fireEvent.press(screen.getByLabelText('marketplace.fromUrl'));
  await fireEvent.press(screen.getByLabelText('marketplace.import'));
  expect((global as any).fetch).not.toHaveBeenCalled();
});

it('imports a theme from URL', async () => {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: jest.fn().mockResolvedValue(VALID_THEME_JSON),
  });
  await render(<ThemeMarketplaceScreen />);
  await fireEvent.press(screen.getByLabelText('marketplace.fromUrl'));
  await fireEvent.changeText(
    screen.getByLabelText('marketplace.importFromUrl'),
    'https://example.com/theme.json',
  );
  await fireEvent.press(screen.getByLabelText('marketplace.import'));
  await waitFor(() => {
    expect(screen.getByText('Imported Theme')).toBeTruthy();
  });
  expect(mockCreate).not.toHaveBeenCalled();
});

it('installs an imported theme from the preview', async () => {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: jest.fn().mockResolvedValue(VALID_THEME_JSON),
  });
  await render(<ThemeMarketplaceScreen />);
  await fireEvent.press(screen.getByLabelText('marketplace.fromUrl'));
  await fireEvent.changeText(
    screen.getByLabelText('marketplace.importFromUrl'),
    'https://example.com/theme.json',
  );
  await fireEvent.press(screen.getByLabelText('marketplace.import'));
  await waitFor(() => {
    expect(screen.getByText('Imported Theme')).toBeTruthy();
  });
  const installButtons = screen.getAllByLabelText('marketplace.install');
  await fireEvent.press(installButtons[installButtons.length - 1]);
  await waitFor(() => {
    expect(mockCreate).toHaveBeenCalledWith('Imported Theme', expect.anything());
  });
});

it('alerts when URL import fails to parse', async () => {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: jest.fn().mockResolvedValue('not-json'),
  });
  await render(<ThemeMarketplaceScreen />);
  await fireEvent.press(screen.getByLabelText('marketplace.fromUrl'));
  await fireEvent.changeText(
    screen.getByLabelText('marketplace.importFromUrl'),
    'https://example.com/bad.json',
  );
  await fireEvent.press(screen.getByLabelText('marketplace.import'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('marketplace.importFailed', 'marketplace.invalidTheme');
  });
});

it('alerts when URL returns a non-ok status', async () => {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 404,
    text: jest.fn(),
  });
  await render(<ThemeMarketplaceScreen />);
  await fireEvent.press(screen.getByLabelText('marketplace.fromUrl'));
  await fireEvent.changeText(
    screen.getByLabelText('marketplace.importFromUrl'),
    'https://example.com/missing.json',
  );
  await fireEvent.press(screen.getByLabelText('marketplace.import'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('marketplace.importFailed', 'HTTP 404');
  });
});

it('alerts on network error during URL import', async () => {
  (global as any).fetch = jest.fn().mockRejectedValue(new Error('Network request failed'));
  await render(<ThemeMarketplaceScreen />);
  await fireEvent.press(screen.getByLabelText('marketplace.fromUrl'));
  await fireEvent.changeText(
    screen.getByLabelText('marketplace.importFromUrl'),
    'https://example.com/theme.json',
  );
  await fireEvent.press(screen.getByLabelText('marketplace.import'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('marketplace.importFailed', 'Network request failed');
  });
});

it('installs a community theme', async () => {
  await render(<ThemeMarketplaceScreen />);
  await fireEvent.press(screen.getAllByLabelText('marketplace.install')[0]);
  await waitFor(() => {
    expect(mockCreate).toHaveBeenCalledWith('Sunset', expect.anything());
  });
  expect(alertSpy).toHaveBeenCalledWith('marketplace.installed', expect.any(String));
});

it('opens preview for a community theme', async () => {
  await render(<ThemeMarketplaceScreen />);
  await fireEvent.press(screen.getAllByLabelText('marketplace.preview')[0]);
  expect(screen.getByText('common.cancel')).toBeTruthy();
  const installButtons = screen.getAllByLabelText('marketplace.install');
  expect(installButtons.length).toBe(5);
});

it('cancels preview without installing', async () => {
  await render(<ThemeMarketplaceScreen />);
  await fireEvent.press(screen.getAllByLabelText('marketplace.preview')[0]);
  expect(screen.getByText('common.cancel')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('common.cancel'));
  expect(screen.queryByText('common.cancel')).toBeNull();
  expect(mockCreate).not.toHaveBeenCalled();
});

it('installs a theme from the preview', async () => {
  await render(<ThemeMarketplaceScreen />);
  await fireEvent.press(screen.getAllByLabelText('marketplace.preview')[0]);
  const installButtons = screen.getAllByLabelText('marketplace.install');
  await fireEvent.press(installButtons[installButtons.length - 1]);
  await waitFor(() => {
    expect(mockCreate).toHaveBeenCalledWith('Sunset', expect.anything());
  });
  expect(alertSpy).toHaveBeenCalledWith('marketplace.installed', expect.any(String));
});

it('shares a community theme', async () => {
  await render(<ThemeMarketplaceScreen />);
  await fireEvent.press(screen.getAllByLabelText('marketplace.share')[0]);
  await waitFor(() => {
    expect(shareSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Theme: Sunset' }));
  });
  const message = (shareSpy.mock.calls[0][0] as { message: string }).message;
  const exported = JSON.parse(message);
  expect(exported.name).toBe('Sunset');
  expect(exported.version).toBe(1);
});
