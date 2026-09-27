import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useBrand } from '../brand/context';

/**
 * Light "paper" backdrop shared by the editorial templates: a faint grid, a
 * soft light sweep in the secondary color, and a small primary accent bar.
 */
export const PaperBackdrop: React.FC<{ sweepEvery?: number }> = ({ sweepEvery = 90 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { colors, alpha } = useBrand();
  const sweepX = interpolate(frame % sweepEvery, [0, sweepEvery], [-width * 0.35, width * 1.2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const grid = alpha(colors.ink, 0.055);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.paper,
        backgroundImage: `linear-gradient(90deg, ${grid} 2px, transparent 2px), linear-gradient(180deg, ${grid} 2px, transparent 2px)`,
        backgroundSize: '48px 48px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: sweepX,
          top: -120,
          width: 120,
          height: height + 240,
          rotate: '12deg',
          background: `linear-gradient(90deg, ${alpha(colors.secondary, 0)}, ${alpha(colors.secondary, 0.48)}, ${alpha(colors.secondary, 0)})`,
          filter: 'blur(10px)',
          opacity: 0.72,
        }}
      />
      <div style={{ position: 'absolute', left: 78, bottom: 138, width: 56, height: 5, background: colors.primary }} />
    </AbsoluteFill>
  );
};
