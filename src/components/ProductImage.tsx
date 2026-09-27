import React, { useState } from 'react';
import { Img, staticFile } from 'remotion';
import { useBrand } from '../brand/context';

/**
 * Product image from public/products with a consistent drop shadow, or a
 * styled placeholder box (showing `label`) when no image is set.
 */
export const ProductImage: React.FC<{
  image: string;
  label: string;
  maxWidth: number;
  maxHeight: number;
  /** Placeholder look: 'paper' (light templates) or 'night' (dark templates). */
  tone?: 'paper' | 'night';
  shadow?: string;
}> = ({ image, label, maxWidth, maxHeight, tone = 'paper', shadow }) => {
  const { colors, font } = useBrand();
  // A missing file falls back to the placeholder instead of failing the whole
  // render; `reelsmith review` / `render` report missing assets separately.
  const [failed, setFailed] = useState(false);
  if (image && !failed) {
    return (
      <Img
        src={staticFile(`products/${image}`)}
        onError={() => setFailed(true)}
        maxRetries={0}
        style={{
          display: 'block',
          maxWidth,
          maxHeight,
          objectFit: 'contain',
          filter:
            shadow ??
            (tone === 'night'
              ? 'drop-shadow(0 30px 60px rgba(0,0,0,0.6))'
              : 'drop-shadow(0 18px 28px rgba(40,28,18,0.22))'),
        }}
      />
    );
  }
  const line = tone === 'night' ? colors.highlight : colors.border;
  return (
    <div
      style={{
        width: Math.min(maxWidth, maxHeight * 0.8),
        height: Math.min(maxHeight, maxWidth * 1.2),
        border: `4px dashed ${line}`,
        borderRadius: tone === 'night' ? 32 : 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: tone === 'night' ? colors.highlight : colors.inkMuted,
        fontFamily: font.display,
        fontSize: Math.max(24, Math.min(44, maxWidth / 12)),
        textTransform: 'uppercase',
        textAlign: 'center',
        padding: 24,
      }}
    >
      {label}
    </div>
  );
};
