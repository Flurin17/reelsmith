import React from 'react';
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { useBrand } from '../../brand/context';
import { KenBurns } from '../../components/KenBurns';

/**
 * Animated dark stage: drifting brand-colored glows, a top spotlight cone,
 * a floor glow under the product, and fine grain. Pure CSS, deterministic.
 */
export const Stage: React.FC<{ background: string; spotlight: number; floorY: number }> = ({
  background,
  spotlight,
  floorY,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const { colors, alpha } = useBrand();
  const t = frame / 30;
  const blob = (seed: number, color: string, size: number) => {
    const x = width * (0.5 + 0.38 * Math.sin(t * 0.35 + seed * 2.1));
    const y = height * (0.45 + 0.3 * Math.cos(t * 0.28 + seed * 1.3));
    return (
      <div
        style={{
          position: 'absolute',
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(color, 0.45)} 0%, ${alpha(color, 0)} 70%)`,
        }}
      />
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: colors.night, overflow: 'hidden' }}>
      {background ? <KenBurns file={background} durationInFrames={durationInFrames} overlay={0.55} /> : null}
      {blob(1, colors.accent, 1100)}
      {blob(2, colors.highlight, 800)}
      {blob(3, colors.primary, 900)}
      {/* Spotlight cone from the top. Two stacked cones fake a soft edge without
          a blur filter (large blurred layers are slow to rasterise). */}
      {[
        { spread: 'polygon(40% 0, 60% 0, 104% 100%, -4% 100%)', a: 0.1 },
        { spread: 'polygon(44% 0, 56% 0, 94% 100%, 6% 100%)', a: 0.18 },
      ].map(({ spread, a }) => (
        <div
          key={spread}
          style={{
            position: 'absolute',
            left: width / 2 - 520,
            top: -200,
            width: 1040,
            height: floorY + 260,
            background: `linear-gradient(180deg, ${alpha(colors.highlight, a * spotlight * 1.6)} 0%, ${alpha(colors.highlight, a * spotlight * 0.35)} 70%, transparent 100%)`,
            clipPath: spread,
          }}
        />
      ))}
      {/* Floor glow */}
      <div
        style={{
          position: 'absolute',
          left: width / 2 - 420,
          top: floorY - 70,
          width: 840,
          height: 140,
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${alpha(colors.highlight, 0.5 * spotlight)} 0%, transparent 70%)`,
        }}
      />
      {/* Grain */}
      <AbsoluteFill style={{ opacity: 0.1 }}>
        {new Array(140).fill(0).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: random(`g-x-${i}-${frame % 3}`) * width,
              top: random(`g-y-${i}-${frame % 3}`) * height,
              width: 2,
              height: 2,
              background: colors.onNight,
            }}
          />
        ))}
      </AbsoluteFill>
      {/* Vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 80% at 50% 45%, transparent 55%, ${alpha(colors.night, 0.85)} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
