/**
 * The theme contract. A brand is ONE file — brands/<id>/theme.ts — that
 * returns `defineTheme({...})`. Only `id`, `name`, `url`, `colors` and `fonts`
 * are required; everything else has sensible defaults (see resolveTheme).
 *
 * Freedom levels, from cheap to total:
 *  1. tokens     — colors, fonts, text styles, shape, motion, backdrop
 *  2. tones      — the color schemes templates rotate through per scene
 *  3. components — replace any primitive (Backdrop, Surface, Price, …) with
 *                  your own React component, for this brand only
 */
import type React from 'react';

export type Ease = [number, number, number, number];

export interface FontSpec {
  /** CSS family name. For Google fonts this is also the lookup key. */
  family: string;
  /** 'google' (default) or 'local' (a file in public/, see `src`). */
  source?: 'google' | 'local';
  /** Weights to load, e.g. ['400', '700']. */
  weights?: string[];
  /** Also load italics. */
  italic?: boolean;
  /** For local fonts: path inside public/, e.g. 'brands/acme/Acme-Bold.woff2'. */
  src?: string;
}

export interface TextStyle {
  /** Which font: display (headlines) or body. */
  font?: 'display' | 'body' | 'mono';
  weight?: number;
  case?: 'upper' | 'lower' | 'none';
  /** Letter spacing in em. */
  tracking?: number;
  lineHeight?: number;
  italic?: boolean;
}

/** A color scheme for one scene: background, text, accent and text-on-accent. */
export interface Tone {
  bg: string;
  text: string;
  accent: string;
  onAccent: string;
  /** Optional muted text color for this tone. */
  muted?: string;
}

export type BackdropKind = 'solid' | 'grid' | 'dots' | 'mesh' | 'spotlight' | 'rays';

export interface Theme {
  id: string;
  name: string;
  /** Domain shown in CTAs, without protocol. */
  url: string;
  handle?: string;
  /** One short brand line; templates may use it as a default kicker. */
  tagline?: string;
  /** BCP 47 locale for prices/numbers, e.g. 'en-US', 'de-CH'. */
  locale?: string;
  /** ISO 4217 currency, e.g. 'USD', 'CHF'. */
  currency?: string;
  /** Logo file inside public/ (SVG recommended). Empty = text wordmark. */
  logo?: string;
  colors: {
    /** Main background. */
    bg: string;
    /** Cards/panels. */
    surface: string;
    /** Main text on bg and surface. */
    text: string;
    /** Secondary text. */
    muted: string;
    /** Borders and dividers. */
    line: string;
    /** Signature color + readable text on it. */
    primary: string;
    onPrimary: string;
    /** Highlight color + readable text on it. */
    accent: string;
    onAccent: string;
    /** Any extra named colors your components need. */
    [name: string]: string;
  };
  /** Scene color schemes (first = default). Defaults to bg/primary/accent combos. */
  tones?: Tone[];
  /** 2–4 colors for mesh/aurora backdrops. Defaults to primary + accent. */
  gradient?: string[];
  fonts: { display: FontSpec; body: FontSpec; mono?: FontSpec };
  text?: { display?: TextStyle; title?: TextStyle; body?: TextStyle; label?: TextStyle };
  shape?: {
    /** Corner radius in px for cards, chips, buttons (0 = square). */
    radius?: number;
    /** Border width in px (0 = none). */
    border?: number;
    /** Card shadow style. */
    shadow?: 'none' | 'soft' | 'hard' | 'glow';
  };
  motion?: {
    /** Cubic-bezier for entrances. */
    ease?: Ease;
    /** Entrance duration in frames. */
    enter?: number;
    /** Delay between staggered items in frames. */
    stagger?: number;
    /** Spring for pops (prices, stickers). */
    spring?: { damping: number; stiffness: number; mass?: number };
    /** Default entrance: how text and cards appear. */
    reveal?: RevealKind;
  };
  backdrop?: {
    kind?: BackdropKind;
    /** Film grain amount 0–1. */
    grain?: number;
  };
  /** Replace any primitive for this brand. See src/theme/primitives/index.ts. */
  components?: Partial<ThemeComponents>;
}

export type RevealKind = 'rise' | 'fade' | 'pop' | 'blur' | 'mask' | 'slide';

/** Primitives a theme may override (props match the default components). */
export interface ThemeComponents {
  Backdrop: React.FC<{ tone?: Tone; seed?: string }>;
  Surface: React.FC<{
    variant?: 'card' | 'glass' | 'solid';
    tone?: Tone;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }>;
  Chip: React.FC<{ tone?: Tone; filled?: boolean; children?: React.ReactNode }>;
  Price: React.FC<{ value: number; variant?: 'badge' | 'tag' | 'plain'; size?: number; delay?: number; tone?: Tone }>;
  Logo: React.FC<{ tone?: Tone; size?: number }>;
}

/** Identity helper for brands/<id>/theme.ts (gives autocompletion). */
export function defineTheme(theme: Theme): Theme {
  return theme;
}
