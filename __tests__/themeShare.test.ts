import { Platform } from 'react-native';
import { THEME_MAP } from '../src/theme';
import {
  exportThemeAsJSON,
  exportBuiltInThemeAsJSON,
  importThemeFromJSON,
  copyThemeToClipboard,
  pasteThemeFromClipboard,
} from '../src/utils/themeShare';
import { CustomTheme } from '../src/store/customThemes';

const origOS = Platform.OS;

function makeCustomTheme(overrides: Partial<CustomTheme> = {}): CustomTheme {
  return {
    id: 1,
    name: 'My Theme',
    colors: { primary: '#123456', bg: '#0A0A1A' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function setPlatformOS(os: string) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true, writable: true });
}

function setNavigatorClipboard(clipboard: { writeText?: jest.Mock; readText?: jest.Mock }) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard },
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', { value: origOS, configurable: true, writable: true });
});

describe('exportThemeAsJSON', () => {
  it('serializes a custom theme with version and colors', () => {
    const json = exportThemeAsJSON(makeCustomTheme());
    const parsed = JSON.parse(json);

    expect(parsed).toEqual({
      name: 'My Theme',
      version: 1,
      colors: { primary: '#123456', bg: '#0A0A1A' },
    });
  });

  it('pretty-prints the JSON with two-space indentation', () => {
    const json = exportThemeAsJSON(makeCustomTheme());

    expect(json).toContain('\n');
    expect(json.split('\n')[1]).toContain('  ');
  });
});

describe('exportBuiltInThemeAsJSON', () => {
  it('serializes a built-in theme', () => {
    const json = exportBuiltInThemeAsJSON('dark');
    const parsed = JSON.parse(json!);

    expect(parsed.name).toBe('dark');
    expect(parsed.version).toBe(1);
    expect(parsed.colors).toEqual({ ...THEME_MAP.dark });
  });

  it('returns null for an unknown theme mode', () => {
    expect(exportBuiltInThemeAsJSON('not-a-theme')).toBeNull();
  });
});

describe('importThemeFromJSON', () => {
  it('imports a valid theme export', () => {
    const result = importThemeFromJSON(
      JSON.stringify({ name: 'Shared', version: 1, colors: { primary: '#ff0000' } }),
    );

    expect(result).toEqual({ name: 'Shared', colors: { primary: '#ff0000' } });
  });

  it('defaults the name when it is missing', () => {
    const result = importThemeFromJSON(
      JSON.stringify({ version: 1, colors: { primary: '#ff0000' } }),
    );

    expect(result!.name).toBe('Imported Theme');
  });

  it('defaults the name when it is not a string', () => {
    const result = importThemeFromJSON(
      JSON.stringify({ name: 42, version: 1, colors: { primary: '#ff0000' } }),
    );

    expect(result!.name).toBe('Imported Theme');
  });

  it('truncates names longer than 100 characters', () => {
    const longName = 'x'.repeat(250);
    const result = importThemeFromJSON(JSON.stringify({ name: longName, version: 1, colors: {} }));

    expect(result!.name).toHaveLength(100);
  });

  it('returns null for invalid JSON', () => {
    expect(importThemeFromJSON('{not json')).toBeNull();
  });

  it('returns null for non-object JSON', () => {
    expect(importThemeFromJSON('42')).toBeNull();
    expect(importThemeFromJSON('null')).toBeNull();
    expect(importThemeFromJSON('"string"')).toBeNull();
  });

  it('returns null when colors are missing', () => {
    expect(importThemeFromJSON(JSON.stringify({ name: 'No Colors' }))).toBeNull();
  });

  it('returns null when colors are not an object', () => {
    expect(importThemeFromJSON(JSON.stringify({ name: 'x', colors: 'red' }))).toBeNull();
  });
});

describe('copyThemeToClipboard', () => {
  it('returns false on native platforms without touching the clipboard', async () => {
    setPlatformOS('ios');
    const writeText = jest.fn();
    setNavigatorClipboard({ writeText });

    const result = await copyThemeToClipboard(makeCustomTheme());

    expect(result).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('writes the theme JSON to the clipboard on web', async () => {
    setPlatformOS('web');
    const writeText = jest.fn().mockResolvedValue(undefined);
    setNavigatorClipboard({ writeText });

    const result = await copyThemeToClipboard(makeCustomTheme());

    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith(exportThemeAsJSON(makeCustomTheme()));
  });

  it('returns false when writing to the clipboard fails on web', async () => {
    setPlatformOS('web');
    const writeText = jest.fn().mockRejectedValue(new Error('denied'));
    setNavigatorClipboard({ writeText });

    const result = await copyThemeToClipboard(makeCustomTheme());

    expect(result).toBe(false);
  });
});

describe('pasteThemeFromClipboard', () => {
  it('returns null on native platforms', async () => {
    setPlatformOS('android');

    const result = await pasteThemeFromClipboard();

    expect(result).toBeNull();
  });

  it('returns the imported theme when reading succeeds on web', async () => {
    setPlatformOS('web');
    const json = JSON.stringify({ name: 'Pasted', version: 1, colors: { primary: '#00ff00' } });
    const readText = jest.fn().mockResolvedValue(json);
    setNavigatorClipboard({ readText });

    const result = await pasteThemeFromClipboard();

    expect(result).toEqual({ name: 'Pasted', colors: { primary: '#00ff00' } });
  });

  it('returns null when reading from the clipboard fails on web', async () => {
    setPlatformOS('web');
    const readText = jest.fn().mockRejectedValue(new Error('denied'));
    setNavigatorClipboard({ readText });

    const result = await pasteThemeFromClipboard();

    expect(result).toBeNull();
  });

  it('returns null when the clipboard contains invalid JSON on web', async () => {
    setPlatformOS('web');
    const readText = jest.fn().mockResolvedValue('not json');
    setNavigatorClipboard({ readText });

    const result = await pasteThemeFromClipboard();

    expect(result).toBeNull();
  });
});
