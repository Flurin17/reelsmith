import React from 'react';
import { useTheme } from '../context';

/** Screen size in px; design app UIs for this canvas. */
export const PHONE_SCREEN = { width: 540, height: 1160 } as const;

/**
 * Phone mockup with a live screen: children render inside a 540×1160 canvas
 * with the theme's surface as background. Pure CSS — no images needed.
 */
export const Phone: React.FC<{ children?: React.ReactNode; screen?: string; style?: React.CSSProperties }> = ({
  children,
  screen,
  style,
}) => {
  const t = useTheme();
  const bezel = 18;
  return (
    <div
      style={{
        position: 'relative',
        width: PHONE_SCREEN.width + bezel * 2,
        height: PHONE_SCREEN.height + bezel * 2,
        padding: bezel,
        borderRadius: 86,
        background: 'linear-gradient(145deg, #3b3b42 0%, #17171b 45%, #0d0d10 100%)',
        boxShadow: `0 60px 120px ${t.alpha('#000000', 0.45)}, inset 0 0 0 2px ${t.alpha('#ffffff', 0.12)}, inset 0 0 0 7px #0b0b0d`,
        ...style,
      }}
    >
      <div
        data-audit="detail"
        style={{
          position: 'relative',
          width: PHONE_SCREEN.width,
          height: PHONE_SCREEN.height,
          borderRadius: 68,
          overflow: 'hidden',
          background: screen ?? t.colors.bg,
        }}
      >
        {children}
        <div
          style={{
            position: 'absolute',
            top: 18,
            left: '50%',
            translate: '-50% 0',
            width: 150,
            height: 42,
            borderRadius: 22,
            background: '#000000',
          }}
        />
      </div>
    </div>
  );
};
