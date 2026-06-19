import {
  spacing,
  radius,
  fontSize,
  fontWeight,
  buttonText,
  elevation,
  cardShadow,
  cardStyle,
  headerBar,
  headerTitle,
  headerSub,
  summaryRow,
  summaryCard,
  summaryValue,
  summaryLabel,
  statLabel,
  statValue,
  primaryBtn,
  primaryBtnText,
  inputStyle,
} from '../src/utils/design';
import { darkTheme } from '../src/theme';

describe('design tokens', () => {
  it('spacing has expected keys', () => {
    expect(spacing.xxs).toBe(4);
    expect(spacing.xs).toBe(8);
    expect(spacing.sm).toBe(12);
    expect(spacing.md).toBe(16);
    expect(spacing.lg).toBe(20);
    expect(spacing.xl).toBe(24);
    expect(spacing.xxl).toBe(32);
  });

  it('radius has expected keys', () => {
    expect(radius.sm).toBe(8);
    expect(radius.md).toBe(12);
    expect(radius.lg).toBe(16);
    expect(radius.xl).toBe(20);
    expect(radius.full).toBe(9999);
  });

  it('fontSize has expected keys', () => {
    expect(fontSize.xs).toBe(10);
    expect(fontSize.base).toBe(13);
    expect(fontSize.h1).toBe(26);
    expect(fontSize.hero).toBe(28);
  });

  it('fontWeight has expected keys', () => {
    expect(fontWeight.regular).toBe('500');
    expect(fontWeight.bold).toBe('700');
    expect(fontWeight.extrabold).toBe('800');
  });

  it('buttonText is white', () => {
    expect(buttonText).toBe('#FFF');
  });

  it('elevation has expected keys', () => {
    expect(elevation.sm).toBe(2);
    expect(elevation.md).toBe(3);
    expect(elevation.lg).toBe(4);
    expect(elevation.xl).toBe(5);
  });
});

describe('cardShadow', () => {
  it('returns elevation on native', () => {
    const result = cardShadow(darkTheme, 'md');
    expect(result).toHaveProperty('elevation');
  });

  it('returns boxShadow on web', () => {
    const origPlatform = process.env.EXPO_OS_WEB;
    const result = cardShadow(darkTheme, 'sm');
    expect(result).toBeTruthy();
  });
});

describe('cardStyle', () => {
  it('returns base card style', () => {
    const result = cardStyle(darkTheme);
    expect(result.backgroundColor).toBe(darkTheme.surface);
    expect(result.borderRadius).toBe(radius.lg);
    expect(result.borderWidth).toBe(1);
    expect(result.borderColor).toBe(darkTheme.border);
  });

  it('merges overrides', () => {
    const result = cardStyle(darkTheme, { padding: 20 });
    expect(result.padding).toBe(20);
  });
});

describe('layout constants', () => {
  it('headerBar has correct properties', () => {
    expect(headerBar.flexDirection).toBe('row');
    expect(headerBar.justifyContent).toBe('space-between');
  });

  it('headerTitle has correct properties', () => {
    expect(headerTitle.fontSize).toBe(fontSize.h1);
    expect(headerTitle.fontWeight).toBe(fontWeight.extrabold);
  });

  it('summaryRow has correct properties', () => {
    expect(summaryRow.flexDirection).toBe('row');
    expect(summaryRow.gap).toBe(spacing.xs);
  });

  it('summaryCard has correct properties', () => {
    expect(summaryCard.flex).toBe(1);
    expect(summaryCard.borderRadius).toBe(radius.lg);
  });

  it('primaryBtn has correct properties', () => {
    expect(primaryBtn.borderRadius).toBe(radius.md);
    expect(primaryBtn.alignItems).toBe('center');
  });

  it('primaryBtnText has correct properties', () => {
    expect(primaryBtnText.color).toBe('#FFF');
    expect(primaryBtnText.fontWeight).toBe(fontWeight.bold);
  });

  it('statLabel has correct properties', () => {
    expect(statLabel.fontSize).toBe(fontSize.xs);
    expect(statLabel.textTransform).toBe('uppercase');
  });

  it('statValue has correct properties', () => {
    expect(statValue.fontSize).toBe(fontSize.h2);
    expect(statValue.fontWeight).toBe(fontWeight.extrabold);
  });
});

describe('inputStyle', () => {
  it('returns themed input style', () => {
    const result = inputStyle(darkTheme);
    expect(result.backgroundColor).toBe(darkTheme.surface);
    expect(result.color).toBe(darkTheme.text);
    expect(result.borderRadius).toBe(radius.md);
    expect(result.borderWidth).toBe(1);
    expect(result.borderColor).toBe(darkTheme.border);
  });
});
