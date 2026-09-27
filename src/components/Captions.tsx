import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useBrand } from '../brand/context';
import { groupPhrases, type CaptionWord } from '../core/captions';

/**
 * Synced, phrase-by-phrase captions with the active word highlighted. Place it
 * inside the scene's <Sequence> so frame 0 is the start of the voiceover.
 * Sits above the platform caption zone by default.
 */
export const Captions: React.FC<{
  words: CaptionWord[];
  /** Distance from the bottom edge in px. */
  bottom?: number;
  maxWords?: number;
  /** 'paper' = dark text on light chips, 'night' = light text with shadow. */
  tone?: 'paper' | 'night';
}> = ({ words, bottom = 430, maxWords = 3, tone = 'paper' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, font } = useBrand();
  if (words.length === 0) return null;

  const t = frame / fps;
  const phrases = groupPhrases(words, maxWords);
  const phrase = phrases.find((p) => t >= p[0].start - 0.05 && t <= p[p.length - 1].end + 0.25);
  if (!phrase) return null;

  const enterFrame = Math.round((phrase[0].start - 0.05) * fps);
  const pop = spring({ frame: frame - enterFrame, fps, config: { damping: 14, stiffness: 180 } });

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          bottom,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '10px 14px',
          scale: interpolate(pop, [0, 1], [0.85, 1]),
          opacity: pop,
        }}
      >
        {phrase.map((word, i) => {
          const active = t >= word.start && t <= word.end + 0.08;
          const paper = tone === 'paper';
          return (
            <span
              key={`${word.start}-${i}`}
              style={{
                fontFamily: font.display,
                fontSize: 76,
                lineHeight: 1.05,
                textTransform: 'uppercase',
                padding: paper ? '4px 14px 0' : 0,
                background: paper ? (active ? colors.secondary : colors.surface) : 'transparent',
                color: paper ? colors.ink : active ? colors.highlight : colors.onNight,
                border: paper ? `3px solid ${colors.ink}` : 'none',
                boxShadow: paper ? `6px 6px 0 ${colors.ink}` : 'none',
                textShadow: paper ? 'none' : '0 5px 18px rgba(0,0,0,0.9)',
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
