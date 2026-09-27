import React, { useState } from 'react';
import { Img, staticFile, useCurrentFrame } from 'remotion';
import { useTheme } from '../context';
import type { Tone } from '../types';

/**
 * Product shot: image (path inside public/ or URL) with a grounded shadow,
 * optional glow behind and mirror reflection below. Missing files fall back
 * to a labelled placeholder instead of failing the render.
 */
export const Product: React.FC<{
  image: string;
  label?: string;
  /** Max box in px. */
  size: number;
  glow?: boolean;
  reflection?: boolean;
  /** Gentle idle float. */
  float?: boolean;
  tone?: Tone;
}> = ({ image, label = '', size, glow = false, reflection = false, float = false, tone }) => {
  const frame = useCurrentFrame();
  const t = useTheme();
  const tn = tone ?? t.tone(0);
  const [failed, setFailed] = useState(false);
  const src = image && !failed ? (/^https?:\/\//.test(image) ? image : staticFile(image)) : '';
  const y = float ? Math.sin(frame / 22) * 10 : 0;

  const img = (mirror: boolean) =>
    src ? (
      <Img
        src={src}
        onError={() => setFailed(true)}
        maxRetries={0}
        style={{
          display: 'block',
          maxWidth: size,
          maxHeight: size,
          objectFit: 'contain',
          ...(mirror
            ? {
                transform: 'scaleY(-1)',
                opacity: 0.22,
                maskImage: 'linear-gradient(180deg, transparent 55%, black 100%)',
                WebkitMaskImage: 'linear-gradient(180deg, transparent 55%, black 100%)',
              }
            : { filter: `drop-shadow(0 ${size * 0.06}px ${size * 0.07}px ${t.alpha('#000000', 0.32)})` }),
        }}
      />
    ) : (
      <div
        style={{
          ...t.type('label'),
          width: size * 0.7,
          height: size * 0.85,
          borderRadius: t.shape.radius,
          border: `3px dashed ${t.alpha(tn.text, 0.4)}`,
          color: tn.text,
          display: mirror ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontSize: 28,
          padding: 20,
        }}
      >
        {label}
      </div>
    );

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      {glow ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: size * 1.3,
            height: size * 1.3,
            translate: '-50% -50%',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${t.alpha(tn.accent, 0.4)} 0%, ${t.alpha(tn.accent, 0)} 62%)`,
          }}
        />
      ) : null}
      <div style={{ position: 'relative', translate: `0px ${y}px` }}>{img(false)}</div>
      {reflection && src ? <div style={{ marginTop: 6, translate: `0px ${-y}px` }}>{img(true)}</div> : null}
    </div>
  );
};
