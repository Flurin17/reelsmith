/**
 * Fill every optional theme field with a default so primitives never branch
 * on `undefined`. Pure — shared by the renderer, the CLI and tests.
 */
import type { BackdropKind, Ease, FontSpec, RevealKind, TextStyle, Theme, Tone } from './types';

export interface ResolvedTheme extends Theme {
  locale: string;
  currency: string;
  logo: string;
  tagline: string;
  handle: string;
  tones: Tone[];
  gradient: string[];
  fonts: {
    display: Required<Omit<FontSpec, 'src'>> & { src?: string };
    body: Required<Omit<FontSpec, 'src'>> & { src?: string };
    mono?: FontSpec;
  };
  text: Record<'display' | 'title' | 'body' | 'label', Required<TextStyle>>;
  shape: { radius: number; border: number; shadow: 'none' | 'soft' | 'hard' | 'glow' };
  motion: {
    ease: Ease;
    enter: number;
    stagger: number;
    spring: { damping: number; stiffness: number; mass: number };
    reveal: RevealKind;
  };
  backdrop: { kind: BackdropKind; grain: number };
}

const font = (f: FontSpec) => ({ source: 'google' as const, weights: ['400'], italic: false, ...f });

const style = (base: Required<TextStyle>, over?: TextStyle): Required<TextStyle> => ({ ...base, ...over });

export function resolveTheme(t: Theme): ResolvedTheme {
  const c = t.colors;
  return {
    ...t,
    locale: t.locale ?? 'en-US',
    currency: t.currency ?? 'USD',
    logo: t.logo ?? '',
    tagline: t.tagline ?? '',
    handle: t.handle ?? '',
    tones: t.tones?.length
      ? t.tones
      : [
          { bg: c.bg, text: c.text, accent: c.accent, onAccent: c.onAccent, muted: c.muted },
          { bg: c.primary, text: c.onPrimary, accent: c.accent, onAccent: c.onAccent },
          { bg: c.surface, text: c.text, accent: c.primary, onAccent: c.onPrimary, muted: c.muted },
        ],
    gradient: t.gradient?.length ? t.gradient : [c.primary, c.accent],
    fonts: { ...t.fonts, display: font(t.fonts.display), body: font(t.fonts.body) },
    text: {
      display: style(
        { font: 'display', weight: 700, case: 'none', tracking: -0.02, lineHeight: 0.95, italic: false },
        t.text?.display,
      ),
      title: style(
        { font: 'display', weight: 700, case: 'none', tracking: -0.01, lineHeight: 1.05, italic: false },
        t.text?.title,
      ),
      body: style(
        { font: 'body', weight: 500, case: 'none', tracking: 0, lineHeight: 1.3, italic: false },
        t.text?.body,
      ),
      label: style(
        { font: 'body', weight: 700, case: 'upper', tracking: 0.12, lineHeight: 1.1, italic: false },
        t.text?.label,
      ),
    },
    shape: { radius: 20, border: 0, shadow: 'soft', ...t.shape },
    motion: {
      ease: t.motion?.ease ?? [0.16, 1, 0.3, 1],
      enter: t.motion?.enter ?? 16,
      stagger: t.motion?.stagger ?? 4,
      spring: { damping: 14, stiffness: 160, mass: 1, ...t.motion?.spring },
      reveal: t.motion?.reveal ?? 'rise',
    },
    backdrop: { kind: 'solid', grain: 0, ...t.backdrop },
  };
}
