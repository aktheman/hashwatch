import {
  darkTheme,
  buildThemeFromColors,
  THEME_MAP,
  THEME_ORDER,
  THEME_EMOJIS,
} from '../src/theme';

describe('buildThemeFromColors', () => {
  it('returns defaults from darkTheme when colors is empty', () => {
    const result = buildThemeFromColors({});
    expect(result.bg).toBe(darkTheme.bg);
    expect(result.primary).toBe(darkTheme.primary);
    expect(result.text).toBe(darkTheme.text);
  });

  it('overrides specified colors', () => {
    const result = buildThemeFromColors({ bg: '#FF0000', primary: '#00FF00' });
    expect(result.bg).toBe('#FF0000');
    expect(result.primary).toBe('#00FF00');
    expect(result.text).toBe(darkTheme.text);
  });

  it('preserves all 22 properties', () => {
    const result = buildThemeFromColors({});
    const keys = Object.keys(darkTheme);
    expect(Object.keys(result)).toEqual(keys);
  });
});

describe('THEME_MAP', () => {
  it('has 13 built-in themes', () => {
    expect(Object.keys(THEME_MAP)).toHaveLength(13);
  });

  it('each theme has all 22 properties', () => {
    for (const [name, t] of Object.entries(THEME_MAP)) {
      expect(Object.keys(t)).toHaveLength(22);
      expect(t).toHaveProperty('bg');
      expect(t).toHaveProperty('primary');
      expect(t).toHaveProperty('text');
    }
  });
});

describe('THEME_ORDER', () => {
  it('has 14 entries (includes system)', () => {
    expect(THEME_ORDER).toHaveLength(14);
  });

  it('starts with system', () => {
    expect(THEME_ORDER[0]).toBe('system');
  });
});

describe('THEME_EMOJIS', () => {
  it('has an emoji for each theme in THEME_ORDER', () => {
    for (const mode of THEME_ORDER) {
      expect(THEME_EMOJIS[mode]).toBeDefined();
    }
  });
});
