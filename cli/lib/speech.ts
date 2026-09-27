/**
 * Find where speech starts/ends in an audio clip, for clips that come without
 * TTS timestamps (e.g. a voiceover you recorded yourself). Decodes with
 * Remotion's bundled ffmpeg, then measures short-window RMS levels.
 */
import { spawnSync } from 'node:child_process';
import { ROOT } from './env';

const SAMPLE_RATE = 16000;
const WINDOW = 320; // 20 ms
const STEP = 160; // 10 ms

export interface SpeechBounds {
  duration: number;
  speechStart: number;
  speechEnd: number;
}

/** Decode any audio file to mono 16-bit PCM at 16 kHz. */
export function decodePcm(file: string): Int16Array {
  const result = spawnSync(
    'npx',
    ['remotion', 'ffmpeg', '-v', 'error', '-i', file, '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 's16le', 'pipe:1'],
    { cwd: ROOT, encoding: 'buffer', maxBuffer: 200 * 1024 * 1024 },
  );
  if (result.status !== 0) throw new Error(`Could not decode ${file}: ${result.stderr?.toString() ?? ''}`);
  const buf = result.stdout;
  return new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 2));
}

const toDb = (rms: number) => (rms <= 0 ? -100 : 20 * Math.log10(rms / 32768));

function percentile(values: number[], p: number): number {
  if (values.length === 0) return -100;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))];
}

/**
 * Adaptive threshold: a bit above the noise floor, but never far below the
 * peak — robust to both clean TTS and noisy recordings.
 */
export function speechBounds(pcm: Int16Array, sampleRate = SAMPLE_RATE): SpeechBounds {
  const levels: { time: number; db: number }[] = [];
  for (let start = 0; start + WINDOW <= pcm.length; start += STEP) {
    let sum = 0;
    for (let i = 0; i < WINDOW; i++) sum += pcm[start + i] * pcm[start + i];
    levels.push({ time: start / sampleRate, db: toDb(Math.sqrt(sum / WINDOW)) });
  }
  const duration = pcm.length / sampleRate;
  if (levels.length === 0) return { duration, speechStart: 0, speechEnd: duration };
  const dbs = levels.map((l) => l.db);
  const peak = Math.max(...dbs);
  const noise = percentile(dbs, 0.12);
  const threshold = Math.min(-30, Math.max(noise + 12, peak - 32, -48));
  const active = levels.filter((l) => l.db >= threshold);
  const speechStart = active[0]?.time ?? 0;
  const last = active.at(-1);
  const speechEnd = last ? Math.min(duration, last.time + WINDOW / sampleRate) : duration;
  return { duration, speechStart, speechEnd };
}
