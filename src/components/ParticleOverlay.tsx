import React from 'react';
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { useBrand } from '../brand/context';

/**
 * Drifting sparkle layer. Positions come from random(seed), so renders are
 * deterministic across machines. Defaults to the brand highlight color.
 */
export const ParticleOverlay: React.FC<{
  count?: number;
  seed?: string;
  color?: string;
}> = ({ count = 50, seed = 'sparkles', color }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { colors } = useBrand();
  const fill = color ?? colors.highlight;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {new Array(count).fill(0).map((_, i) => {
        const x = random(`${seed}-x-${i}`) * width;
        const baseY = random(`${seed}-y-${i}`) * height;
        const size = 2 + random(`${seed}-s-${i}`) * 6;
        const speed = 0.3 + random(`${seed}-v-${i}`) * 1.4;
        const twinkle = 0.4 + 0.6 * Math.abs(Math.sin((frame + i * 11) / 14));
        const y = (baseY - frame * speed) % height;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y < 0 ? y + height : y,
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: fill,
              opacity: twinkle,
              boxShadow: `0 0 ${size * 2}px ${fill}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
