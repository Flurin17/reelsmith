import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useBrand } from '../brand/context';

/**
 * Price with a big major part and a small raised minor part, formatted for
 * the brand locale/currency ("$39", "CHF 149⁵⁰", "39⁹⁰ €").
 */
export const PriceText: React.FC<{
  value: number;
  size: number;
  /** Show the currency next to the number (false = caller renders it). */
  withCurrency?: boolean;
}> = ({ value, size, withCurrency = true }) => {
  const { priceParts } = useBrand();
  const p = priceParts(value);
  const currency = withCurrency ? (
    <span style={{ fontSize: size * 0.55, margin: p.currencyFirst ? '0 0.18em 0 0' : '0 0 0 0.18em' }}>
      {p.currency}
    </span>
  ) : null;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-start', fontSize: size, lineHeight: 1 }}>
      {p.currencyFirst ? currency : null}
      {p.major}
      {p.minor ? (
        <span style={{ fontSize: size * 0.45, marginTop: size * 0.06 }}>
          {p.decimal}
          {p.minor}
        </span>
      ) : null}
      {p.currencyFirst ? null : currency}
    </span>
  );
};

/**
 * Circular price badge that springs in with an overshoot — the physics pop is
 * the whole point of the effect. Uses the brand accent color.
 */
export const PriceBadge: React.FC<{ price: number; delay?: number; size?: number }> = ({
  price,
  delay = 0,
  size = 230,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, font, priceParts } = useBrand();
  const pop = spring({ frame: frame - delay, fps, config: { damping: 9, mass: 0.8, stiffness: 120 } });
  const p = priceParts(price);
  // Short symbols ("$", "€") sit inline; codes ("CHF") go on their own line.
  const inline = p.currency.length === 1;
  const numberSize = size * (p.major.length + (inline ? 1 : 0) > 3 ? 0.3 : 0.4);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: colors.accent,
        color: colors.onAccent,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 14px 40px rgba(0,0,0,0.5), inset 0 0 0 6px rgba(255,255,255,0.18)',
        scale: interpolate(pop, [0, 1], [0, 1]),
        rotate: `${interpolate(pop, [0, 1], [-18, -8])}deg`,
        fontFamily: font.display,
      }}
    >
      <PriceText value={price} size={numberSize} withCurrency={inline} />
      {inline ? null : <span style={{ fontSize: size * 0.15, letterSpacing: 3, marginTop: 4 }}>{p.currency}</span>}
    </div>
  );
};
