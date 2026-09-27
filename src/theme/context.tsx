import React, { createContext, useContext, useMemo } from 'react';
import { Easing, interpolate, spring } from 'remotion';
import { BRANDS, DEFAULT_BRAND } from '../../brands';
import { formatPrice, formatTotal, priceParts, withAlpha } from './format';
import { resolveTheme, type ResolvedTheme } from './resolve';
import type { TextStyle, Tone } from './types';

const cache = new Map<string, ResolvedTheme>();

/** Resolved theme for a brand id (falls back to the default brand). */
export function getTheme(id?: string): ResolvedTheme {
  const key = id && BRANDS[id] ? id : DEFAULT_BRAND;
  let theme = cache.get(key);
  if (!theme) {
    const raw = BRANDS[key];
    if (!raw) throw new Error(`Unknown brand "${key}". Known: ${Object.keys(BRANDS).join(', ')}`);
    theme = resolveTheme(raw);
    cache.set(key, theme);
  }
  return theme;
}

const ThemeContext = createContext<ResolvedTheme | null>(null);

export const ThemeProvider: React.FC<{ brand?: string; children: React.ReactNode }> = ({ brand, children }) => {
  const theme = useMemo(() => getTheme(brand), [brand]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

const stack = (family: string, fallback: string) => `"${family}", ${fallback}`;

/**
 * Everything a component needs to stay on-brand. Components must take every
 * color, font, radius, shadow and easing from here — never from literals.
 */
export function useTheme() {
  const theme = useContext(ThemeContext) ?? getTheme();
  return useMemo(() => {
    const font = {
      display: stack(theme.fonts.display.family, 'system-ui, sans-serif'),
      body: stack(theme.fonts.body.family, 'system-ui, sans-serif'),
      mono: theme.fonts.mono ? stack(theme.fonts.mono.family, 'ui-monospace, monospace') : 'ui-monospace, monospace',
    };
    const ease = Easing.bezier(...theme.motion.ease);

    /** CSS for a text variant: font, weight, case, tracking, line height. */
    const type = (variant: keyof ResolvedTheme['text'], over?: TextStyle): React.CSSProperties => {
      const s = { ...theme.text[variant], ...over };
      return {
        fontFamily: font[s.font],
        fontWeight: s.weight,
        textTransform: s.case === 'upper' ? 'uppercase' : s.case === 'lower' ? 'lowercase' : 'none',
        letterSpacing: `${s.tracking}em`,
        lineHeight: s.lineHeight,
        fontStyle: s.italic ? 'italic' : 'normal',
      };
    };

    /** Card shadow in the theme's style, tinted with `color`. */
    const shadow = (color: string = theme.colors.text, depth = 1): string => {
      switch (theme.shape.shadow) {
        case 'hard':
          return `${10 * depth}px ${10 * depth}px 0 ${color}`;
        case 'glow':
          return `0 0 ${40 * depth}px ${withAlpha(color, 0.45)}, 0 ${20 * depth}px ${60 * depth}px ${withAlpha('#000000', 0.35)}`;
        case 'soft':
          return `0 ${18 * depth}px ${50 * depth}px ${withAlpha('#000000', 0.18)}, 0 ${4 * depth}px ${12 * depth}px ${withAlpha('#000000', 0.08)}`;
        default:
          return 'none';
      }
    };

    return {
      ...theme,
      font,
      type,
      shadow,
      ease,
      alpha: withAlpha,
      /** Tone by index, cycling (scene i → theme.tones[i % n]). */
      tone: (i = 0): Tone => theme.tones[((i % theme.tones.length) + theme.tones.length) % theme.tones.length],
      /** 0→1 entrance progress with the theme's duration and easing. */
      enter: (frame: number, delay = 0, duration = theme.motion.enter) =>
        interpolate(frame - delay, [0, duration], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: ease,
        }),
      /** 0→1(+overshoot) spring with the theme's feel. */
      pop: (frame: number, fps: number, delay = 0) =>
        spring({ frame: frame - delay, fps, config: theme.motion.spring }),
      price: (v: number) => formatPrice(v, theme.locale, theme.currency),
      priceParts: (v: number) => priceParts(v, theme.locale, theme.currency),
      total: (vs: number[]) => formatTotal(vs, theme.locale, theme.currency),
    };
  }, [theme]);
}

export type ThemeKit = ReturnType<typeof useTheme>;
