import { Platform, ViewStyle, TextStyle } from 'react-native';
import { Theme } from '../theme';

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const fontSize = {
  xs: 10,
  sm: 11,
  base: 13,
  md: 15,
  lg: 16,
  xl: 18,
  h3: 20,
  h2: 22,
  h1: 26,
  hero: 28,
} as const;

export const fontWeight = {
  regular: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  extrabold: '800' as TextStyle['fontWeight'],
};

export const buttonText = '#FFF';

export const elevation = {
  sm: 2,
  md: 3,
  lg: 4,
  xl: 5,
} as const;

export function cardShadow(theme: Theme, intensity: 'sm' | 'md' | 'lg' = 'md'): ViewStyle {
  const blur = intensity === 'sm' ? 12 : intensity === 'lg' ? 24 : 20;
  if (Platform.OS === 'web') {
    return { boxShadow: `0 4px ${blur}px ${theme.glow}` } as ViewStyle;
  }
  return {
    elevation: intensity === 'sm' ? elevation.sm : intensity === 'lg' ? elevation.lg : elevation.md,
  };
}

export function cardStyle(theme: Theme, overrides?: ViewStyle): ViewStyle {
  return {
    backgroundColor: theme.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
    ...cardShadow(theme, 'md'),
    ...overrides,
  };
}

export const headerBar: ViewStyle = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
  paddingBottom: spacing.xs,
};

export const headerTitle: TextStyle = {
  fontSize: fontSize.h1,
  fontWeight: fontWeight.extrabold,
  letterSpacing: -0.5,
};

export const headerSub: TextStyle = {
  color: undefined,
  fontSize: fontSize.sm,
  marginTop: spacing.xxs,
};

export const summaryRow: ViewStyle = {
  flexDirection: 'row',
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xxs,
  gap: spacing.xs,
};

export const summaryCard: ViewStyle = {
  flex: 1,
  borderRadius: radius.lg,
  padding: 14,
  alignItems: 'center',
  borderWidth: 1,
};

export const summaryValue: TextStyle = {
  fontSize: fontSize.h2,
  fontWeight: fontWeight.extrabold,
  letterSpacing: -0.3,
};

export const summaryLabel: TextStyle = {
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  marginTop: spacing.xxs,
};

export const statLabel: TextStyle = {
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

export const statValue: TextStyle = {
  fontSize: fontSize.h2,
  fontWeight: fontWeight.extrabold,
};

export const primaryBtn: ViewStyle = {
  borderRadius: radius.md,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.xl,
  alignItems: 'center',
  justifyContent: 'center',
};

export const primaryBtnText: TextStyle = {
  color: '#FFF',
  fontWeight: fontWeight.bold,
  fontSize: fontSize.md,
};

export const inputStyle = (theme: Theme): TextStyle => ({
  backgroundColor: theme.surface,
  borderRadius: radius.md,
  padding: spacing.sm,
  color: theme.text,
  fontSize: fontSize.md,
  borderWidth: 1,
  borderColor: theme.border,
});
