/**
 * Scene timeline resolution.
 *
 * Scene-based templates let every scene omit `from` and `duration`:
 * - `duration` comes from (1) the value in props, (2) the measured length of the
 *   scene's voiceover + a tail pad (see withVoiceoverDurations), or (3) a
 *   template default.
 * - `from` defaults to the end of the previous scene (back-to-back scenes).
 *
 * `reelsmith voiceover` writes measured durations back into the job file, so
 * renders are reproducible; the in-browser measurement is only a fallback.
 */
import { z } from 'zod';

/** Fields every timed scene shares. */
export const timedScene = {
  /** Stable id: used for voiceover file names and `--scene` filters. */
  id: z.string().min(1),
  /** Start frame. Omit to start right after the previous scene. */
  from: z.number().int().nonnegative().optional(),
  /** Length in frames. Omit to derive it from the voiceover (or the default). */
  duration: z.number().int().positive().optional(),
  /** File in public/voiceovers/ (usually written by `reelsmith voiceover`). */
  voiceover: z.string().default(''),
};

export interface TimedScene {
  id: string;
  from?: number;
  duration?: number;
  voiceover?: string;
}

export type Placed<S extends TimedScene> = S & { from: number; duration: number };

/** Fill in `from`/`duration` for every scene. Pure and synchronous. */
export function layoutScenes<S extends TimedScene>(scenes: S[], defaultDuration: number): Placed<S>[] {
  let cursor = 0;
  return scenes.map((scene) => {
    const duration = scene.duration ?? defaultDuration;
    const from = scene.from ?? cursor;
    cursor = from + duration;
    return { ...scene, from, duration };
  });
}

/** Composition length: the end of the last-ending scene. */
export function timelineLength(scenes: { from: number; duration: number }[]): number {
  return Math.max(1, ...scenes.map((s) => s.from + s.duration));
}

/** Frames needed to play `seconds` of audio plus a tail pad. */
export function framesForAudio(seconds: number, fps: number, tailPadding = 0.3): number {
  return Math.ceil((seconds + tailPadding) * fps);
}

/**
 * For scenes that have a voiceover but no explicit duration, measure the audio
 * and set `duration`. `measure` is injected so this stays testable; templates
 * pass the Mediabunny-based `audioDurationSeconds`.
 */
export async function withVoiceoverDurations<S extends TimedScene>(
  scenes: S[],
  fps: number,
  measure: (voiceover: string) => Promise<number | null>,
  tailPadding = 0.3,
): Promise<S[]> {
  return Promise.all(
    scenes.map(async (scene) => {
      if (scene.duration != null || !scene.voiceover) return scene;
      const seconds = await measure(scene.voiceover);
      return seconds == null ? scene : { ...scene, duration: framesForAudio(seconds, fps, tailPadding) };
    }),
  );
}
