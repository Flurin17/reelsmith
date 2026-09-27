import React from 'react';
import { useTheme } from '../context';
import type { Tone } from '../types';

/** Card / panel in the theme's shape language. */
export const DefaultSurface: React.FC<{
  variant?: 'card' | 'glass' | 'solid';
  tone?: Tone;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ variant = 'card', tone, style, children }) => {
  const t = useTheme();
  const tn = tone ?? t.tone(0);
  const border = t.shape.border;
  const base: React.CSSProperties = {
    borderRadius: t.shape.radius,
    border: border ? `${border}px solid ${t.shape.shadow === 'hard' ? tn.text : t.alpha(tn.text, 0.14)}` : 'none',
    boxShadow: t.shadow(t.shape.shadow === 'glow' ? tn.accent : tn.text),
    color: tn.text,
  };
  const fill: React.CSSProperties =
    variant === 'glass'
      ? {
          background: `linear-gradient(160deg, ${t.alpha(tn.text, 0.12)}, ${t.alpha(tn.text, 0.04)})`,
          backdropFilter: 'blur(18px)',
        }
      : variant === 'solid'
        ? { background: tn.accent, color: tn.onAccent }
        : { background: t.colors.surface, color: t.colors.text };
  return <div style={{ ...base, ...fill, ...style }}>{children}</div>;
};

/** Small label / pill. */
export const DefaultChip: React.FC<{ tone?: Tone; filled?: boolean; children?: React.ReactNode }> = ({
  tone,
  filled,
  children,
}) => {
  const t = useTheme();
  const tn = tone ?? t.tone(0);
  return (
    <div
      style={{
        ...t.type('label'),
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 30,
        padding: '14px 26px 13px',
        borderRadius: Math.min(t.shape.radius * 2, 999),
        background: filled ? tn.accent : 'transparent',
        color: filled ? tn.onAccent : tn.text,
        border: `${Math.max(2, t.shape.border)}px solid ${filled ? tn.accent : t.alpha(tn.text, 0.5)}`,
      }}
    >
      {children}
    </div>
  );
};
