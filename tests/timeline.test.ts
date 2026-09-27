import { describe, expect, it } from 'vitest';
import { framesForAudio, layoutScenes, timelineLength, withVoiceoverDurations } from '../src/core/timeline';

describe('layoutScenes', () => {
  it('places scenes back to back with defaults', () => {
    const placed = layoutScenes([{ id: 'a' }, { id: 'b', duration: 50 }, { id: 'c' }], 90);
    expect(placed.map((s) => [s.from, s.duration])).toEqual([
      [0, 90],
      [90, 50],
      [140, 90],
    ]);
    expect(timelineLength(placed)).toBe(230);
  });

  it('respects explicit from values (overlaps allowed)', () => {
    const placed = layoutScenes([{ id: 'a', duration: 100 }, { id: 'b', from: 80, duration: 40 }, { id: 'c' }], 30);
    expect(placed.map((s) => s.from)).toEqual([0, 80, 120]);
  });
});

describe('voiceover durations', () => {
  it('rounds audio length plus tail padding up to whole frames', () => {
    expect(framesForAudio(2, 30, 0.3)).toBe(69);
  });

  it('only measures scenes that have audio and no explicit duration', async () => {
    const measured: string[] = [];
    const scenes = await withVoiceoverDurations(
      [
        { id: 'a', voiceover: 'x/a.mp3' },
        { id: 'b', voiceover: 'x/b.mp3', duration: 10 },
        { id: 'c', voiceover: '' },
        { id: 'd', voiceover: 'x/missing.mp3' },
      ],
      30,
      async (file) => {
        measured.push(file);
        return file.endsWith('missing.mp3') ? null : 1;
      },
      0,
    );
    expect(measured).toEqual(['x/a.mp3', 'x/missing.mp3']);
    expect(scenes.map((s) => s.duration)).toEqual([30, 10, undefined, undefined]);
  });
});
