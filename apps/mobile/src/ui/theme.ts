/**
 * M2 visual baseline from docs/design/DESIGN.md. Semantic tokens only;
 * screens must not hardcode palette values elsewhere.
 */
export const theme = {
  color: {
    canvas: '#F7F8F5',
    raised: '#FFFFFF',
    textPrimary: '#17251F',
    textSecondary: '#41534C',
    actionPrimary: '#174F46',
    /** Field/section boundaries. Darkened from the first draft after measured
        verification: 3.43:1 on raised, 3.22:1 on canvas (minimum 3:1). */
    border: '#7F8E88',
    statusWarning: '#8A5700',
    statusDanger: '#A22B2B',
  },
  /** Four-point spacing base. */
  spacing: (steps: number): number => steps * 4,
  radius: {
    field: 12,
    card: 12,
  },
  fontSize: {
    small: 14,
    body: 16,
    title: 24,
    header: 32,
  },
  /** Minimum interactive target edge in density-independent pixels. */
  minTouchTarget: 48,
} as const;

export type Theme = typeof theme;

function channelLuminance(channel: number): number {
  const linear = channel / 255;
  return linear <= 0.03928 ? linear / 12.92 : Math.pow((linear + 0.055) / 1.055, 2.4);
}

function parseHex(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((part) => part + part)
          .join('')
      : normalized;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [red, green, blue] = parseHex(hex).map(channelLuminance);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/**
 * WCAG contrast ratio between two token colors. Used by automated tests to
 * verify the approved baseline instead of trusting the table by itself.
 */
export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}
