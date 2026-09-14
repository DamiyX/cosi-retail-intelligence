import { contrastRatio, theme } from '../src/ui/theme';

describe('M2 design token contrast', () => {
  it.each([
    ['primary text', theme.color.textPrimary, theme.color.raised],
    ['secondary text', theme.color.textSecondary, theme.color.raised],
    ['primary text', theme.color.textPrimary, theme.color.canvas],
    ['secondary text', theme.color.textSecondary, theme.color.canvas],
    ['button text', theme.color.raised, theme.color.actionPrimary],
    ['warning text', theme.color.statusWarning, theme.color.raised],
    ['warning text', theme.color.statusWarning, theme.color.canvas],
    ['danger text', theme.color.statusDanger, theme.color.raised],
  ])('%s on its background meets 4.5:1', (_label, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['field boundary', theme.color.border, theme.color.raised],
    ['field boundary', theme.color.border, theme.color.canvas],
  ])('%s meets 3:1', (_label, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(3);
  });
});
