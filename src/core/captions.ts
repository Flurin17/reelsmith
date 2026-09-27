/**
 * Word-level captions from TTS character alignment.
 *
 * `reelsmith voiceover` asks the provider for per-character timestamps and
 * stores the resulting words on each scene (`captions`), so templates can show
 * perfectly synced subtitles without a transcription step.
 */
import { z } from 'zod';

export const captionWord = z.object({
  text: z.string(),
  /** Seconds from the start of the scene's voiceover clip. */
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  /** Dialogue speaker key (e.g. "a"), empty for single-voice clips. */
  speaker: z.string().default(''),
});
export type CaptionWord = z.infer<typeof captionWord>;

export interface CharacterAlignment {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
}

/**
 * Collapse character timings into words. Expressive audio tags such as
 * "[excited]" are spoken as direction, not words, so they are dropped.
 * `speakerAt(i)` optionally maps a character index to a speaker key.
 */
export function alignmentToWords(
  alignment: CharacterAlignment,
  speakerAt: (charIndex: number) => string = () => '',
): CaptionWord[] {
  const { characters, characterStartTimesSeconds: starts, characterEndTimesSeconds: ends } = alignment;
  const words: CaptionWord[] = [];
  let text = '';
  let start = 0;
  let end = 0;
  let speaker = '';
  let inTag = false;

  const flush = () => {
    const clean = text.trim();
    if (clean) words.push({ text: clean, start: round(start), end: round(end), speaker });
    text = '';
  };

  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    if (ch === '[') {
      flush();
      inTag = true;
      continue;
    }
    if (inTag) {
      if (ch === ']') inTag = false;
      continue;
    }
    if (/\s/.test(ch)) {
      flush();
      continue;
    }
    if (!text) {
      start = starts[i] ?? 0;
      speaker = speakerAt(i);
    }
    text += ch;
    end = ends[i] ?? start;
  }
  flush();
  return words;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Group words into short on-screen phrases (TikTok-style captions). A phrase
 * breaks after `maxWords`, after sentence punctuation, on a speaker change,
 * or on a pause longer than `maxGap` seconds.
 */
export function groupPhrases(words: CaptionWord[], maxWords = 3, maxGap = 0.45): CaptionWord[][] {
  const phrases: CaptionWord[][] = [];
  let current: CaptionWord[] = [];
  for (const word of words) {
    const prev = current.at(-1);
    const breakBefore =
      prev != null &&
      (current.length >= maxWords ||
        /[.!?,;:]$/.test(prev.text) ||
        prev.speaker !== word.speaker ||
        word.start - prev.end > maxGap);
    if (breakBefore) {
      phrases.push(current);
      current = [];
    }
    current.push(word);
  }
  if (current.length) phrases.push(current);
  return phrases;
}

/** Remove expressive audio tags ("[warmly] Hi" → "Hi") for on-screen text. */
export function stripAudioTags(text: string): string {
  return text
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Voiceover sidecar written next to each clip (public/voiceovers/<slug>/<scene>.json).
 * Compact on purpose: jobs stay small, agents never need to read timestamps.
 */
export interface VoiceoverSidecar {
  /** Seconds until the last spoken word ends. */
  speechEnd: number;
  /** [text, start, end, speaker?] per word, seconds from clip start. */
  words: [string, number, number, string?][];
}

export const toSidecarWords = (words: CaptionWord[]): VoiceoverSidecar['words'] =>
  words.map((w) => (w.speaker ? [w.text, w.start, w.end, w.speaker] : [w.text, w.start, w.end]));

export const fromSidecarWords = (words: VoiceoverSidecar['words']): CaptionWord[] =>
  words.map(([text, start, end, speaker]) => ({ text, start, end, speaker: speaker ?? '' }));

/** Sidecar path for a clip path ("slug/hook.mp3" → "slug/hook.json"). */
export const sidecarPath = (clip: string) => clip.replace(/\.[a-z0-9]+$/i, '.json');

/**
 * Evenly spread the words of `text` over `seconds` — a stand-in for real
 * timings so captions and kinetic type preview before any voiceover exists.
 */
export function evenCaptions(text: string, seconds: number): CaptionWord[] {
  const words = stripAudioTags(text).split(/\s+/).filter(Boolean);
  const step = Math.max(0.15, (seconds - 0.4) / Math.max(words.length, 1));
  return words.map((w, i) => ({ text: w, start: 0.15 + i * step, end: 0.15 + (i + 0.85) * step, speaker: '' }));
}
