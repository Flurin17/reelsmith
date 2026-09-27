import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useTheme, type ThemeKit } from '../context';
import type { RevealKind } from '../types';

/**
 * Styles for an element entering at frame `at` with a reveal kind. `outer` is
 * the clipping wrapper (only used by 'mask'), `inner` the moving element.
 */
export function revealStyle(
  kind: RevealKind,
  t: ThemeKit,
  frame: number,
  fps: number,
  at: number,
): { outer: React.CSSProperties; inner: React.CSSProperties } {
  const p = t.enter(frame, at);
  switch (kind) {
    case 'fade':
      return { outer: {}, inner: { opacity: p, translate: `0px ${(1 - p) * 14}px` } };
    case 'pop': {
      const s = t.pop(frame, fps, at);
      return { outer: {}, inner: { opacity: Math.min(1, s * 1.5), scale: interpolate(s, [0, 1], [0.6, 1]) } };
    }
    case 'blur':
      return {
        outer: {},
        inner: { opacity: p, filter: `blur(${(1 - p) * 14}px)`, scale: interpolate(p, [0, 1], [1.08, 1]) },
      };
    case 'mask':
      return {
        outer: { overflow: 'hidden', paddingBottom: '0.08em', marginBottom: '-0.08em' },
        inner: { translate: `0px ${(1 - p) * 110}%` },
      };
    case 'slide':
      return {
        outer: {},
        inner: { opacity: p > 0 ? 1 : 0, transform: `translateX(${(1 - p) * -60}px) skewX(${(1 - p) * -8}deg)` },
      };
    default:
      return { outer: {}, inner: { opacity: p, translate: `0px ${(1 - p) * 46}px` } };
  }
}

/** Entrance wrapper using the theme's motion (or an explicit kind). */
export const Reveal: React.FC<{
  kind?: RevealKind;
  delay?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ kind, delay = 0, style, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const kindUsed = kind ?? t.motion.reveal;
  const { outer, inner } = revealStyle(kindUsed, t, frame, fps, delay);
  return (
    <div data-audit={kindUsed === 'mask' ? 'reveal' : undefined} style={{ ...outer, ...style }}>
      <div style={inner}>{children}</div>
    </div>
  );
};

/** 0→1 exit progress over the last `frames` of a scene (for fade-outs). */
export function useExit(duration: number, frames = 10): number {
  const frame = useCurrentFrame();
  return interpolate(frame, [duration - frames, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}
