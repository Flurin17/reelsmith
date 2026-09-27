import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { useBrand } from '../brand/context';

/**
 * Persistent logo (or text wordmark) top-center, pushed down to clear the
 * phone status bar / Dynamic Island.
 */
export const BrandOverlay: React.FC<{ tone?: 'light' | 'dark' }> = ({ tone = 'light' }) => {
  const { logo, name, colors, font } = useBrand();
  const onDark = tone === 'light';

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: 150, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        {logo ? (
          <Img
            src={staticFile(logo)}
            style={{
              height: 64,
              filter: onDark
                ? 'brightness(0) invert(1) drop-shadow(0 3px 10px rgba(0,0,0,0.7))'
                : 'drop-shadow(0 3px 0 rgba(255,253,250,0.8))',
            }}
          />
        ) : (
          <div
            style={{
              fontFamily: font.display,
              fontSize: 52,
              letterSpacing: 3,
              textTransform: 'uppercase',
              lineHeight: 1,
              color: onDark ? colors.onNight : colors.ink,
              textShadow: onDark ? '0 3px 10px rgba(0,0,0,0.7)' : 'none',
            }}
          >
            {name}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

/** Small boxed label above headlines ("kicker"). */
export const Kicker: React.FC<{ children: React.ReactNode; tone?: 'surface' | 'secondary' }> = ({
  children,
  tone = 'surface',
}) => {
  const { colors, font } = useBrand();
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: '11px 18px',
        border: `1px solid ${colors.ink}`,
        background: tone === 'secondary' ? colors.secondary : colors.surface,
        color: tone === 'secondary' ? colors.onSecondary : colors.primary,
        fontFamily: font.body,
        fontWeight: 800,
        fontSize: 30,
        letterSpacing: 2,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  );
};

/** Two-bar brand divider (primary + secondary). */
export const AccentDivider: React.FC<{ marginTop?: number }> = ({ marginTop = 26 }) => {
  const { colors } = useBrand();
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop }}>
      <div style={{ width: 64, height: 7, background: colors.primary }} />
      <div style={{ width: 22, height: 7, background: colors.secondary }} />
    </div>
  );
};
