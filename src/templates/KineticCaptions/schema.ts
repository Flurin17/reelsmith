import { z } from 'zod';
import { captionWord, type CaptionWord } from '../../core/captions';
import { musicSchema, sfxSchema } from '../../core/schemas';
import { layoutScenes, timedScene } from '../../core/timeline';
import { withBrand } from '../../core/template';

export const kineticScene = z.object({
  ...timedScene,
  /** What is said (and shown). May contain [audio tags]; they are not shown. */
  voiceoverText: z.string().min(1),
  /** Word timings from `reelsmith voiceover`. Without them words are evenly timed. */
  captions: z.array(captionWord).default([]),
  /** Words to highlight (case-insensitive, punctuation ignored). */
  emphasis: z.array(z.string()).default([]),
  /** Background color token for this scene. */
  tone: z.enum(['ink', 'primary', 'secondary', 'paper']).default('ink'),
  /** Optional sticker image (public/products) that pops in beside the words. */
  image: z.string().default(''),
  /** End on the brand domain typed into a pill. */
  cta: z.boolean().default(false),
});
export type KineticScene = z.infer<typeof kineticScene>;

export const kineticCaptionsProps = withBrand({
  /** Slug for the voiceover folder. */
  topic: z.string().min(1),
  scenes: z.array(kineticScene).min(1),
  /** Max words on screen at once. */
  wordsPerPhrase: z.number().int().min(1).max(5).default(3),
  /** Scene length when there is no voiceover yet: seconds per spoken word. */
  secondsPerWord: z.number().positive().default(0.42),
  music: musicSchema,
  sfx: sfxSchema,
});
export type KineticCaptionsProps = z.infer<typeof kineticCaptionsProps>;

const clean = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export const isEmphasis = (word: string, emphasis: string[]) => emphasis.map(clean).includes(clean(word));

/**
 * Evenly spread words over `seconds` — the preview fallback before real
 * voiceover timings exist.
 */
export function evenCaptions(text: string, seconds: number): CaptionWord[] {
  const words = text
    .replace(/\[[^\]]*\]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const step = (seconds - 0.4) / Math.max(words.length, 1);
  return words.map((w, i) => ({ text: w, start: 0.15 + i * step, end: 0.15 + (i + 0.85) * step, speaker: '' }));
}

/** Seconds a CTA scene holds after its words, for the domain to type in. */
export const CTA_HOLD_SECONDS = 2.8;

/** Default scene length (frames) from its word count, when no audio exists. */
export function fallbackFrames(
  scene: Pick<KineticScene, 'voiceoverText'>,
  secondsPerWord: number,
  fps: number,
): number {
  const words = scene.voiceoverText
    .replace(/\[[^\]]*\]/g, '')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.round(Math.max(1.6, words * secondsPerWord + 0.5) * fps);
}

/**
 * Timeline for this template: speech (or word-count) length per scene, plus a
 * hold on CTA scenes so the typed domain has time to finish.
 */
export function placeKinetic(props: Pick<KineticCaptionsProps, 'scenes' | 'secondsPerWord'>, fps: number) {
  return layoutScenes<KineticScene>(
    props.scenes.map((s) => ({
      ...s,
      duration:
        (s.duration ?? fallbackFrames(s, props.secondsPerWord, fps)) + (s.cta ? Math.round(CTA_HOLD_SECONDS * fps) : 0),
    })),
    fps * 3,
  );
}

export const defaultKineticCaptionsProps: KineticCaptionsProps = kineticCaptionsProps.parse({
  topic: 'kinetic-desk-setup',
  scenes: [
    { id: 'hook', voiceoverText: '[curious] Your desk is killing your focus.', emphasis: ['killing'], tone: 'ink' },
    {
      id: 'light',
      voiceoverText: 'Start with warm light, not the ceiling lamp.',
      emphasis: ['warm'],
      tone: 'secondary',
      image: 'orbit-lamp.svg',
    },
    {
      id: 'green',
      voiceoverText: 'Add one plant. Just one.',
      emphasis: ['one'],
      tone: 'primary',
      image: 'terra-planter.svg',
    },
    {
      id: 'quiet',
      voiceoverText: 'And block the noise when it counts.',
      emphasis: ['noise'],
      tone: 'paper',
      image: 'aurora-headphones.svg',
    },
    { id: 'cta', voiceoverText: '[warmly] Build yours on our site.', emphasis: ['yours'], tone: 'ink', cta: true },
  ],
});
