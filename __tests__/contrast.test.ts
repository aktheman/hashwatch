import {
  hexToRgb,
  relativeLuminance,
  contrastRatio,
  auditThemeContrast,
} from '../src/utils/contrast';

describe('hexToRgb', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgb('#FFFFFF')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgb('#FF0000')).toEqual([255, 0, 0]);
  });

  it('handles lowercase', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#6c63ff')).toEqual([108, 99, 255]);
  });

  it('handles without hash', () => {
    expect(hexToRgb('FFFFFF')).toEqual([255, 255, 255]);
  });
});

describe('relativeLuminance', () => {
  it('returns 1 for white', () => {
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1, 2);
  });

  it('returns 0 for black', () => {
    expect(relativeLuminance(0, 0, 0)).toBe(0);
  });

  it('calculates for mid-gray', () => {
    const lum = relativeLuminance(128, 128, 128);
    expect(lum).toBeGreaterThan(0.2);
    expect(lum).toBeLessThan(0.3);
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });

  it('returns 1 for same colors', () => {
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
  });

  it('is symmetric', () => {
    const a = contrastRatio('#FF0000', '#00FF00');
    const b = contrastRatio('#00FF00', '#FF0000');
    expect(a).toBeCloseTo(b, 2);
  });
});

describe('auditThemeContrast', () => {
  it('returns 9 checks', () => {
    const theme = {
      bg: '#000000',
      surface: '#111111',
      text: '#FFFFFF',
      textDim: '#CCCCCC',
      textMuted: '#888888',
      primary: '#6C63FF',
      success: '#10B981',
      danger: '#EF4444',
    };
    const results = auditThemeContrast(theme);
    expect(results).toHaveLength(9);
    expect(results[0].pair).toBe('text on bg');
  });

  it('marks passing pairs', () => {
    const theme = {
      bg: '#000000',
      surface: '#111111',
      text: '#FFFFFF',
      textDim: '#FFFFFF',
      textMuted: '#FFFFFF',
      primary: '#FFFFFF',
      success: '#FFFFFF',
      danger: '#FFFFFF',
    };
    const results = auditThemeContrast(theme);
    expect(results.every((r) => r.pass)).toBe(true);
  });

  it('marks failing pairs', () => {
    const theme = {
      bg: '#000000',
      surface: '#000000',
      text: '#000000',
      textDim: '#000000',
      textMuted: '#000000',
      primary: '#000000',
      success: '#000000',
      danger: '#000000',
    };
    const results = auditThemeContrast(theme);
    expect(results.every((r) => !r.pass)).toBe(true);
  });
});
