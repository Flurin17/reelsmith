import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { useTheme } from '../context';

/** Number that counts up from 0 (locale-formatted). */
export const Counter: React.FC<{
  value: number;
  delay?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Format as the theme currency. */
  currency?: boolean;
}> = ({ value, delay = 0, duration = 36, decimals, prefix = '', suffix = '', currency = false }) => {
  const frame = useCurrentFrame();
  const t = useTheme();
  const p = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const d = decimals ?? (Number.isInteger(value) ? 0 : 1);
  const n = value * p;
  const text = currency
    ? new Intl.NumberFormat(t.locale, {
        style: 'currency',
        currency: t.currency,
        maximumFractionDigits: d,
        minimumFractionDigits: d,
      }).format(n)
    : new Intl.NumberFormat(t.locale, { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
};
