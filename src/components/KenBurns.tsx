import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Video } from '@remotion/media';
import { useBrand } from '../brand/context';

const VIDEO_EXT = /\.(mp4|webm|mov|mkv)$/i;

/**
 * Full-frame background with a slow continuous zoom. `file` is a video or
 * image inside public/bg; when empty, a brand-tinted gradient is used so the
 * render never breaks.
 */
export const KenBurns: React.FC<{
  file: string;
  durationInFrames: number;
  /** Zoom at the end of the scene. 1.12 = +12%. */
  zoom?: number;
  /** Darken the asset so overlaid text stays readable (0–1). */
  overlay?: number;
  /** Where the fallback gradient glows from, e.g. "50% 18%". */
  glowAt?: string;
}> = ({ file, durationInFrames, zoom = 1.12, overlay = 0.35, glowAt = '50% 18%' }) => {
  const frame = useCurrentFrame();
  const { colors, alpha } = useBrand();
  const scale = interpolate(frame, [0, durationInFrames], [1, zoom], { extrapolateRight: 'clamp' });
  const src = file ? staticFile(`bg/${file}`) : null;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.night, overflow: 'hidden' }}>
      {src ? (
        <AbsoluteFill style={{ scale }}>
          {VIDEO_EXT.test(file) ? (
            <Video src={src} loop muted objectFit="cover" style={{ width: '100%', height: '100%' }} />
          ) : (
            <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            background: `radial-gradient(120% 90% at ${glowAt}, ${alpha(colors.accent, 0.32)} 0%, ${colors.night} 62%)`,
            scale,
          }}
        />
      )}
      {overlay > 0 ? <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${overlay})` }} /> : null}
    </AbsoluteFill>
  );
};
