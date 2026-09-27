import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { useTheme, type ThemeKit } from '../context';
import type { RevealKind, TextStyle } from '../types';
import { revealStyle } from './Reveal';

type Variant = 'display' | 'title' | 'body' | 'label';

/**
 * Largest font size (≤ max) at which `text` fits in `width` × `lines`, and its
 * longest word fits on one line. Uses real font metrics (fonts are loaded).
 */
export function fitSize(
  theme: ThemeKit,
  text: string,
  opts: { width: number; lines?: number; max: number; min?: number; variant?: Variant },
): number {
  const variant = opts.variant ?? 'display';
  const s = theme.text[variant];
  const family = (s.font === 'mono' ? theme.fonts.mono : theme.fonts[s.font])?.family ?? theme.fonts.body.family;
  const clean = text.replace(/\*/g, '');
  const cased = s.case === 'upper' ? clean.toUpperCase() : s.case === 'lower' ? clean.toLowerCase() : clean;
  const longest = cased.split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a), '');
  const lines = opts.lines ?? 3;
  const size = Math.min(
    opts.max,
    sizeFor(cased, opts.width * lines * 0.9, family, s.weight, s.tracking, s.italic),
    sizeFor(longest, opts.width * 0.98, family, s.weight, s.tracking, s.italic),
  );
  return Math.max(opts.min ?? 24, Math.floor(size));
}

let ctx: CanvasRenderingContext2D | null | undefined;

/** Font size at which `text` is exactly `width` px wide (canvas metrics; rough estimate outside a browser). */
function sizeFor(
  text: string,
  width: number,
  family: string,
  weight: number,
  tracking: number,
  italic: boolean,
): number {
  if (ctx === undefined)
    ctx = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  if (!ctx || !text) return width / Math.max(text.length * 0.6, 1);
  ctx.font = `${italic ? 'italic ' : ''}${weight} 100px "${family}"`;
  const w = ctx.measureText(text).width + tracking * 100 * text.length;
  return (100 * width) / Math.max(w, 1);
}

/**
 * Split text into reveal tokens. Plain text splits into words; an *emphasis*
 * span stays one token so it never breaks across lines.
 */
export function emphasisWords(text: string): { word: string; hot: boolean }[] {
  const out: { word: string; hot: boolean }[] = [];
  for (const part of text.split(/(\*[^*]+\*)/)) {
    if (/^\*[^*]+\*$/.test(part)) {
      out.push({ word: part.slice(1, -1).trim(), hot: true });
      continue;
    }
    for (const w of part.split(/\s+/).filter(Boolean)) {
      // Attach punctuation that directly follows an emphasis span ("*this*.").
      if (/^[.,!?:;]+$/.test(w) && out.length) out[out.length - 1].word += w;
      else out.push({ word: w, hot: false });
    }
  }
  return out;
}

/** Theme-styled text block. */
export const Text: React.FC<{
  variant?: Variant;
  size: number;
  color?: string;
  align?: React.CSSProperties['textAlign'];
  style?: React.CSSProperties;
  over?: TextStyle;
  children: React.ReactNode;
}> = ({ variant = 'body', size, color, align, style, over, children }) => {
  const t = useTheme();
  return (
    <div
      style={{ ...t.type(variant, over), fontSize: size, color: color ?? t.tone(0).text, textAlign: align, ...style }}
    >
      {children}
    </div>
  );
};

/**
 * Kinetic headline: words reveal one after another in the theme's style.
 * Wrap a word in *asterisks* to emphasise it (accent highlight).
 */
export const Words: React.FC<{
  text: string;
  size: number;
  variant?: Variant;
  delay?: number;
  stagger?: number;
  kind?: RevealKind;
  color?: string;
  /** Emphasis: accent text color, or a filled accent block. */
  emphasis?: 'color' | 'block' | 'underline';
  accent?: string;
  onAccent?: string;
  align?: 'left' | 'center' | 'right';
  style?: React.CSSProperties;
}> = ({
  text,
  size,
  variant = 'display',
  delay = 0,
  stagger,
  kind,
  color,
  emphasis = 'color',
  accent,
  onAccent,
  align = 'center',
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const tone = t.tone(0);
  const words = emphasisWords(text);
  const step = stagger ?? t.motion.stagger;
  const k = kind ?? t.motion.reveal;
  const acc = accent ?? tone.accent;
  return (
    <div
      style={{
        ...t.type(variant),
        fontSize: size,
        color: color ?? tone.text,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        columnGap: '0.24em',
        rowGap: '0.02em',
        ...style,
      }}
    >
      {words.map(({ word, hot }, i) => {
        const at = delay + i * step;
        const { outer, inner } = revealStyle(k, t, frame, fps, at);
        const hotStyle: React.CSSProperties = !hot
          ? {}
          : emphasis === 'block'
            ? {
                background: acc,
                color: onAccent ?? tone.onAccent,
                padding: '0 0.12em',
                borderRadius: Math.min(t.shape.radius, 16),
              }
            : emphasis === 'underline'
              ? {
                  textDecoration: 'underline',
                  textDecorationColor: acc,
                  textDecorationThickness: '0.08em',
                  textUnderlineOffset: '0.12em',
                }
              : { color: acc };
        return (
          <span key={i} data-audit={k === 'mask' ? 'reveal' : undefined} style={{ display: 'inline-block', ...outer }}>
            <span style={{ display: 'inline-block', whiteSpace: 'nowrap', ...inner, ...hotStyle }}>{word}</span>
          </span>
        );
      })}
    </div>
  );
};
