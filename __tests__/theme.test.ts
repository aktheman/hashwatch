import {
  setTheme,
  getTheme,
  setThemeMode,
  getThemeMode,
  darkTheme,
  lightTheme,
  neonTheme,
  matrixTheme,
  stratumTheme,
} from '../src/theme';

beforeEach(() => {
  setTheme(darkTheme);
});

describe('setTheme / getTheme', () => {
  it('starts with dark theme', () => {
    const t = getTheme();
    expect(t.bg).toBe(darkTheme.bg);
  });

  it('switches to light theme', () => {
    setTheme(lightTheme);
    const t = getTheme();
    expect(t.bg).toBe(lightTheme.bg);
    expect(t.text).toBe(lightTheme.text);
  });

  it('switches back to dark theme', () => {
    setTheme(lightTheme);
    setTheme(darkTheme);
    expect(getTheme().bg).toBe(darkTheme.bg);
  });

  it('switches to neon theme', () => {
    setTheme(neonTheme);
    expect(getTheme().bg).toBe(neonTheme.bg);
    expect(getTheme().primary).toBe(neonTheme.primary);
  });

  it('switches to matrix theme', () => {
    setTheme(matrixTheme);
    expect(getTheme().bg).toBe(matrixTheme.bg);
    expect(getTheme().primary).toBe(matrixTheme.primary);
  });

  it('switches to stratum theme', () => {
    setTheme(stratumTheme);
    expect(getTheme().bg).toBe(stratumTheme.bg);
    expect(getTheme().primary).toBe(stratumTheme.primary);
  });
});

describe('setThemeMode / getThemeMode', () => {
  it('returns default mode as dark', () => {
    expect(getThemeMode()).toBe('dark');
  });

  it('mode stays dark after setTheme(darkTheme)', () => {
    setTheme(darkTheme);
    expect(getThemeMode()).toBe('dark');
  });

  it('mode is light after setTheme(lightTheme)', () => {
    setTheme(lightTheme);
    expect(getThemeMode()).toBe('light');
  });

  it('mode is matrix after setTheme(matrixTheme)', () => {
    setTheme(matrixTheme);
    expect(getThemeMode()).toBe('matrix');
  });

  it('mode is neon after setTheme(neonTheme)', () => {
    setTheme(neonTheme);
    expect(getThemeMode()).toBe('neon');
  });

  it('mode is 5tratum after setTheme(stratumTheme)', () => {
    setTheme(stratumTheme);
    expect(getThemeMode()).toBe('5tratum');
  });

  it('applies the correct theme via setThemeMode', () => {
    setThemeMode('neon');
    expect(getTheme().bg).toBe(neonTheme.bg);
    expect(getThemeMode()).toBe('neon');
  });

  it('setThemeMode matrix applies matrix theme', () => {
    setThemeMode('matrix');
    expect(getTheme().bg).toBe(matrixTheme.bg);
  });

  it('setThemeMode 5tratum applies stratum theme', () => {
    setThemeMode('5tratum');
    expect(getTheme().bg).toBe(stratumTheme.bg);
  });

  it('setThemeMode light applies light theme', () => {
    setThemeMode('light');
    expect(getTheme().bg).toBe(lightTheme.bg);
  });

  it('setThemeMode dark applies dark theme', () => {
    setThemeMode('light');
    setThemeMode('dark');
    expect(getTheme().bg).toBe(darkTheme.bg);
  });
});
