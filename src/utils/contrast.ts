export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(...hexToRgb(fg));
  const l2 = relativeLuminance(...hexToRgb(bg));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function auditThemeContrast(
  theme: Record<string, string>,
): { pair: string; ratio: number; pass: boolean }[] {
  const checks: { pair: string; fg: string; bg: string; min: number }[] = [
    { pair: 'text on bg', fg: theme.text, bg: theme.bg, min: 4.5 },
    { pair: 'text on surface', fg: theme.text, bg: theme.surface, min: 4.5 },
    { pair: 'textDim on bg', fg: theme.textDim, bg: theme.bg, min: 4.5 },
    { pair: 'textDim on surface', fg: theme.textDim, bg: theme.surface, min: 4.5 },
    { pair: 'textMuted on bg', fg: theme.textMuted, bg: theme.bg, min: 3 },
    { pair: 'textMuted on surface', fg: theme.textMuted, bg: theme.surface, min: 3 },
    { pair: 'primary on surface', fg: theme.primary, bg: theme.surface, min: 3 },
    { pair: 'success on surface', fg: theme.success, bg: theme.surface, min: 3 },
    { pair: 'danger on surface', fg: theme.danger, bg: theme.surface, min: 3 },
  ];

  return checks.map(({ pair, fg, bg, min }) => {
    const ratio = Math.round(contrastRatio(fg, bg) * 100) / 100;
    return { pair, ratio, pass: ratio >= min };
  });
}
