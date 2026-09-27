import React from 'react';
import { Sequence, staticFile, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';

/**
 * One-shot sound effect at an absolute frame. Renders nothing when `file` is
 * empty, so every SFX slot can be muted from props.
 */
export const Sfx: React.FC<{
  /** File in public/sfx. */
  file: string;
  at: number;
  /** Relative volume, multiplied by `master`. */
  volume?: number;
  master?: number;
  /** Seconds to keep the clip mounted. */
  seconds?: number;
}> = ({ file, at, volume = 1, master = 1, seconds = 1.2 }) => {
  const { fps } = useVideoConfig();
  if (!file || at < 0) return null;
  return (
    <Sequence from={Math.round(at)} durationInFrames={Math.ceil(fps * seconds)} layout="none">
      <Audio src={staticFile(`sfx/${file}`)} volume={volume * master} />
    </Sequence>
  );
};

/** Background music bed for the whole composition. */
export const Music: React.FC<{ file: string; volume: number }> = ({ file, volume }) =>
  file ? <Audio src={staticFile(`music/${file}`)} volume={volume} loop /> : null;

/** A scene's voiceover clip, placed at the scene start. */
export const Voiceover: React.FC<{ file: string; from: number; duration: number }> = ({ file, from, duration }) =>
  file ? (
    <Sequence from={from} durationInFrames={duration} layout="none">
      <Audio src={staticFile(`voiceovers/${file}`)} />
    </Sequence>
  ) : null;
