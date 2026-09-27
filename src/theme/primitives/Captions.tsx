import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { groupPhrases, type CaptionWord } from '../../core/captions';
import { useTheme } from '../context';
import type { Tone } from '../types';

/**
 * Word-synced captions, phrase by phrase, active word highlighted in the
 * tone's accent. Place inside the scene's Sequence (frame 0 = clip start).
 */
export const Captions: React.FC<{ words: CaptionWord[]; tone?: Tone; bottom?: number; maxWords?: number }> = ({
  words,
  tone,
  bottom = 380,
  maxWords = 3,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const tn = tone ?? t.tone(0);
  const now = frame / fps;
  const phrase = groupPhrases(words, maxWords).find(
    (p) => now >= p[0].start - 0.05 && now <= p[p.length - 1].end + 0.3,
  );
  if (!phrase) return null;
  const pop = t.pop(frame, fps, Math.round((phrase[0].start - 0.05) * fps));
  return (
    <div
      style={{
        position: 'absolute',
        left: 80,
        right: 80,
        bottom,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '6px 16px',
        opacity: Math.min(1, pop * 1.5),
        scale: interpolate(pop, [0, 1], [0.9, 1]),
      }}
    >
      {phrase.map((w, i) => {
        const active = now >= w.start && now <= w.end + 0.1;
        return (
          <span
            key={`${w.start}-${i}`}
            style={{
              ...t.type('title'),
              fontSize: 72,
              padding: '2px 16px',
              borderRadius: Math.min(t.shape.radius, 18),
              background: active ? tn.accent : t.alpha(tn.bg, 0.72),
              color: active ? tn.onAccent : tn.text,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
