import React from 'react';
import { Img, staticFile } from 'remotion';
import { useTheme } from '../context';
import type { Tone } from '../types';

/** Brand logo image, or the brand name as a wordmark in the display font. */
export const DefaultLogo: React.FC<{ tone?: Tone; size?: number }> = ({ tone, size = 46 }) => {
  const t = useTheme();
  const tn = tone ?? t.tone(0);
  if (t.logo) return <Img src={staticFile(t.logo)} style={{ height: size * 1.2 }} />;
  return (
    <div style={{ ...t.type('title'), fontSize: size, color: tn.text, lineHeight: 1, whiteSpace: 'nowrap' }}>
      {t.name}
    </div>
  );
};
