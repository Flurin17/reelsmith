import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useTheme } from '../context';
import type { Tone } from '../types';

/** Ticker band: repeating text scrolling sideways, slightly rotated. Decorative. */
export const Marquee: React.FC<{
  text: string;
  tone?: Tone;
  top: number;
  rotate?: number;
  speed?: number;
  size?: number;
}> = ({ text, tone, top, rotate = -4, speed = 6, size = 72 }) => {
  const frame = useCurrentFrame();
  const t = useTheme();
  const tn = tone ?? t.tone(0);
  const unit = `${text}  ✦  `;
  return (
    <div
      data-audit="decorative"
      style={{
        position: 'absolute',
        left: -300,
        right: -300,
        top,
        rotate: `${rotate}deg`,
        background: tn.accent,
        color: tn.onAccent,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        padding: `${size * 0.22}px 0 ${size * 0.14}px`,
        ...t.type('display'),
        fontSize: size,
        lineHeight: 1,
      }}
    >
      <div style={{ translate: `${-((frame * speed) % (size * unit.length * 0.5))}px 0px` }}>{unit.repeat(14)}</div>
    </div>
  );
};
