/**
 * Shared plumbing for scene-based (narrated) templates.
 *
 * A scene needs only an `id` and what is said (`say`). Timing is automatic:
 *   duration = job value → voiceover sidecar (speech length) → word count estimate.
 * Captions come from the sidecar, or are evenly timed from `say` for previews.
 */
import { z } from 'zod';
import { captionWord, evenCaptions, stripAudioTags, type CaptionWord } from './captions';
import { withVoiceover } from './media';
import { layoutScenes, timelineLength, type Placed } from './timeline';

/** Fields every narrated scene has. Spread into a template's scene schema. */
export const sceneFields = {
  id: z.string().min(1).describe('unique per job; names the voiceover file'),
  say: z.string().default('').describe('narration; may contain [audio tags]; drives captions + timing'),
  voiceover: z.string().default('').describe('set by `reelsmith voiceover`'),
  duration: z.number().int().positive().optional().describe('frames; omit = automatic'),
  from: z.number().int().nonnegative().optional().describe('frames; omit = after previous scene'),
  captions: z.array(captionWord).optional().describe('internal: filled from the voiceover sidecar'),
};

export interface SceneLike {
  id: string;
  say: string;
  voiceover: string;
  duration?: number;
  from?: number;
  captions?: CaptionWord[];
}

/** Estimated frames for a scene without audio: reading pace + a little air. */
export function estimateFrames(say: string, fps: number, min = 2.2, perWord = 0.36): number {
  const words = stripAudioTags(say).split(/\s+/).filter(Boolean).length;
  return Math.round(Math.max(min, words * perWord + 0.9) * fps);
}

/** calculateMetadata body: load voiceover data, then place scenes. */
export async function resolveScenes<S extends SceneLike>(
  scenes: S[],
  fps: number,
  opts: { tailPadding?: number; extra?: (s: S) => number; min?: number } = {},
): Promise<{ scenes: S[]; durationInFrames: number }> {
  const withVo = await withVoiceover(scenes, fps, opts.tailPadding);
  const placed = placeScenes(withVo, fps, opts);
  return { scenes: withVo, durationInFrames: timelineLength(placed) };
}

/** Sync placement used by components and stills (after calculateMetadata). */
export function placeScenes<S extends SceneLike>(
  scenes: S[],
  fps: number,
  opts: { extra?: (s: S) => number; min?: number } = {},
): Placed<S>[] {
  return layoutScenes(
    scenes.map((s) => ({
      ...s,
      duration: (s.duration ?? estimateFrames(s.say, fps, opts.min)) + (opts.extra?.(s) ?? 0),
    })),
    fps * 3,
  );
}

/** Words to show for a scene: real timings, or evenly spread `say`. */
export function sceneWords(scene: SceneLike & { duration: number }, fps: number, extraFrames = 0): CaptionWord[] {
  if (scene.captions?.length) return scene.captions;
  return evenCaptions(scene.say, (scene.duration - extraFrames) / fps);
}

/** One still per scene, ~60% in (for review/stills). */
export const sceneStills = (placed: { from: number; duration: number }[], at = 0.6) =>
  placed.map((s) => s.from + Math.min(Math.round(s.duration * at), Math.max(0, s.duration - 10)));
