import React from 'react';
import { AbsoluteFill } from 'remotion';
import { SAFE } from '../../core/template';
import { useTheme } from '../context';
import type { Tone } from '../types';
import { Backdrop, Logo } from './index';

/**
 * Standard scene frame: brand backdrop for a tone, logo top-center, and a
 * safe-area content column. Start new templates from this.
 */
export const Frame: React.FC<{
  tone?: Tone;
  logo?: boolean;
  seed?: string;
  /** Content alignment inside the safe area. */
  justify?: React.CSSProperties['justifyContent'];
  gap?: number;
  children?: React.ReactNode;
}> = ({ tone, logo = true, seed, justify = 'center', gap = 36, children }) => {
  const t = useTheme();
  const tn = tone ?? t.tone(0);
  return (
    <AbsoluteFill>
      <Backdrop tone={tn} seed={seed} />
      {logo ? (
        <div style={{ position: 'absolute', top: 140, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <Logo tone={tn} size={40} />
        </div>
      ) : null}
      <AbsoluteFill
        style={{
          padding: `${SAFE.top + 40}px ${SAFE.side}px ${SAFE.bottom}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: justify,
          gap,
          color: tn.text,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
