/**
 * Browser-side helpers used from calculateMetadata().
 */
import { ALL_FORMATS, Input, UrlSource } from 'mediabunny';
import { staticFile } from 'remotion';
import { fromSidecarWords, sidecarPath, type CaptionWord, type VoiceoverSidecar } from './captions';
import { framesForAudio } from './timeline';

/** Duration of public/voiceovers/<file> in seconds, or null if missing/unreadable. */
export async function audioDurationSeconds(voiceover: string): Promise<number | null> {
  try {
    const input = new Input({
      formats: ALL_FORMATS,
      source: new UrlSource(staticFile(`voiceovers/${voiceover}`), { getRetryDelay: () => null }),
    });
    return await input.computeDuration();
  } catch {
    return null;
  }
}

async function readSidecar(voiceover: string): Promise<VoiceoverSidecar | null> {
  try {
    const res = await fetch(staticFile(`voiceovers/${sidecarPath(voiceover)}`));
    return res.ok ? ((await res.json()) as VoiceoverSidecar) : null;
  } catch {
    return null;
  }
}

/**
 * For every scene with a `voiceover`, load its sidecar (written by
 * `reelsmith voiceover`) and fill `captions` and `duration` unless the job set
 * them explicitly. Clips without a sidecar are measured instead.
 */
export async function withVoiceover<S extends { voiceover?: string; duration?: number; captions?: CaptionWord[] }>(
  scenes: S[],
  fps: number,
  tailPadding = 0.3,
): Promise<S[]> {
  return Promise.all(
    scenes.map(async (scene) => {
      if (!scene.voiceover) return scene;
      const sidecar = await readSidecar(scene.voiceover);
      if (sidecar) {
        return {
          ...scene,
          captions: scene.captions?.length ? scene.captions : fromSidecarWords(sidecar.words),
          duration: scene.duration ?? framesForAudio(sidecar.speechEnd, fps, tailPadding),
        };
      }
      if (scene.duration != null) return scene;
      const seconds = await audioDurationSeconds(scene.voiceover);
      return seconds == null ? scene : { ...scene, duration: framesForAudio(seconds, fps, tailPadding) };
    }),
  );
}
