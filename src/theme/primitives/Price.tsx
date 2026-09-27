import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useTheme } from '../context';
import type { Tone } from '../types';

/** Price parts laid out: big major, raised small minor, currency where the locale puts it. */
export const PriceText: React.FC<{ value: number; size: number; showCurrency?: boolean }> = ({
  value,
  size,
  showCurrency = true,
}) => {
  const t = useTheme();
  const p = t.priceParts(value);
  const cur = showCurrency ? (
    <span style={{ fontSize: size * 0.46, margin: p.currencyFirst ? '0.08em 0.14em 0 0' : '0.08em 0 0 0.14em' }}>
      {p.currency}
    </span>
  ) : null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-start', lineHeight: 1, fontSize: size }}>
      {p.currencyFirst ? cur : null}
      {p.major}
      {p.minor ? (
        <span style={{ fontSize: size * 0.42, marginTop: size * 0.06 }}>
          {p.decimal}
          {p.minor}
        </span>
      ) : null}
      {p.currencyFirst ? null : cur}
    </span>
  );
};

/** Price as a springing badge (circle), a tilted tag, or plain text. */
export const DefaultPrice: React.FC<{
  value: number;
  variant?: 'badge' | 'tag' | 'plain';
  size?: number;
  delay?: number;
  tone?: Tone;
}> = ({ value, variant = 'badge', size = 220, delay = 0, tone }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const tn = tone ?? t.tone(0);
  const s = t.pop(frame, fps, delay);
  const font = { ...t.type('display', { case: 'none', tracking: -0.02 }) };

  if (variant === 'plain') {
    return (
      <div style={{ ...font, color: tn.text, opacity: Math.min(1, s * 1.4) }}>
        <PriceText value={value} size={size * 0.4} />
      </div>
    );
  }
  if (variant === 'tag') {
    return (
      <div
        style={{
          ...font,
          display: 'inline-flex',
          padding: `${size * 0.08}px ${size * 0.14}px ${size * 0.05}px`,
          background: tn.accent,
          color: tn.onAccent,
          borderRadius: Math.min(t.shape.radius, 14),
          border: t.shape.border ? `${Math.max(3, t.shape.border)}px solid ${tn.text}` : 'none',
          boxShadow: t.shadow(tn.text, 0.6),
          scale: s,
          rotate: `${interpolate(s, [0, 1], [-24, -6])}deg`,
        }}
      >
        <PriceText value={value} size={size * 0.36} />
      </div>
    );
  }
  const long = t.priceParts(value).major.length > 3;
  return (
    <div
      style={{
        ...font,
        width: size,
        height: size,
        borderRadius: '50%',
        background: tn.accent,
        color: tn.onAccent,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: t.shadow(tn.accent),
        scale: s,
        rotate: `${interpolate(s, [0, 1], [-20, -8])}deg`,
      }}
    >
      <PriceText value={value} size={size * (long ? 0.26 : 0.34)} />
    </div>
  );
};
