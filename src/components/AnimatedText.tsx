import React from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useBrand } from '../brand/context';

/** Strong, readable shadow for copy over busy footage. */
export const TEXT_SHADOW = '0 6px 24px rgba(0,0,0,0.85), 0 2px 6px rgba(0,0,0,0.9)';

/**
 * Headline that reveals with a fade + overshooting scale-up. Defaults to the
 * brand display font in the "night" text color.
 */
export const AnimatedText: React.FC<{
  children: React.ReactNode;
  /** Delay before the reveal starts, in frames. */
  delay?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number | string;
  letterSpacing?: number;
  uppercase?: boolean;
  shadow?: boolean;
  style?: React.CSSProperties;
}> = ({
  children,
  delay = 0,
  fontSize = 120,
  color,
  fontFamily,
  fontWeight = 400,
  letterSpacing = 1,
  uppercase = true,
  shadow = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, font } = useBrand();
  const local = frame - delay;
  const ease = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) } as const;

  const opacity = interpolate(local, [0, 0.4 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = interpolate(local, [0, 0.5 * fps], [0.82, 1], ease);
  const translateY = interpolate(local, [0, 0.5 * fps], [40, 0], ease);

  return (
    <div
      style={{
        fontFamily: fontFamily ?? font.display,
        fontWeight,
        fontSize,
        lineHeight: 1.04,
        color: color ?? colors.onNight,
        letterSpacing,
        textTransform: uppercase ? 'uppercase' : 'none',
        textShadow: shadow ? TEXT_SHADOW : 'none',
        textAlign: 'center',
        opacity,
        scale,
        translate: `0px ${translateY}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
