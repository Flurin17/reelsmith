/**
 * Browser-side media helpers used from calculateMetadata().
 */
import { ALL_FORMATS, Input, UrlSource } from 'mediabunny';
import { staticFile } from 'remotion';

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

/** Natural size of an image in public/, or null if it cannot be loaded. */
export function imageSize(path: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = staticFile(path);
  });
}
