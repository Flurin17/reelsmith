import { z } from 'zod';
import { captionWord } from '../../core/captions';
import { musicSchema, sfxSchema } from '../../core/schemas';
import { timedScene } from '../../core/timeline';
import { withBrand } from '../../core/template';

const card = z.object({
  label: z.string(),
  /** File in public/products (or any public/ subfolder path via "../"). */
  image: z.string().default(''),
  note: z.string().default(''),
});

/** What fills the lower half of a scene. */
export const explainerVisual = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({ type: z.literal('image'), image: z.string(), caption: z.string().default('') }),
  z.object({ type: z.literal('bullets'), items: z.array(z.string()).min(1).max(5) }),
  z.object({ type: z.literal('versus'), left: card, right: card }),
  z.object({
    type: z.literal('stat'),
    value: z.number(),
    prefix: z.string().default(''),
    suffix: z.string().default(''),
    label: z.string().default(''),
  }),
  /** Closing card: the brand domain types itself into a browser bar. */
  z.object({ type: z.literal('cta'), button: z.string().default('Go') }),
]);
export type ExplainerVisual = z.infer<typeof explainerVisual>;

export const dialogueTurn = z.object({
  /** Key into config.voice.voices (e.g. "a", "b"). */
  speaker: z.string(),
  text: z.string().min(1),
});

export const explainerScene = z.object({
  ...timedScene,
  kicker: z.string().default(''),
  headline: z.string().default(''),
  body: z.string().default(''),
  /** Narration for `reelsmith voiceover` (may contain [audio tags]). */
  voiceoverText: z.string().default(''),
  /** Alternative to voiceoverText: a multi-voice exchange rendered as one clip. */
  dialogue: z.array(dialogueTurn).default([]),
  /** Word timings written by `reelsmith voiceover`; drives on-screen captions. */
  captions: z.array(captionWord).default([]),
  visual: explainerVisual.prefault({ type: 'none' }),
});
export type ExplainerScene = z.infer<typeof explainerScene>;

export const explainerProps = withBrand({
  /** Slug used for the voiceover folder (public/voiceovers/<topic>/). */
  topic: z.string().min(1),
  scenes: z.array(explainerScene).min(1),
  /** Show synced word captions when a scene has them. */
  showCaptions: z.boolean().default(true),
  /** Scene length when neither `duration` nor a voiceover is available. */
  defaultSceneSeconds: z.number().positive().default(4),
  music: musicSchema,
  sfx: sfxSchema,
});
export type ExplainerProps = z.infer<typeof explainerProps>;

export const defaultExplainerProps: ExplainerProps = explainerProps.parse({
  topic: 'demo-explainer',
  scenes: [
    {
      id: 'hook',
      kicker: 'Quick guide',
      headline: 'Headphones or speaker?',
      body: 'The 20-second answer',
      voiceoverText: '[curious] Headphones or a speaker? Here is the twenty second answer.',
      visual: {
        type: 'versus',
        left: { label: 'Headphones', image: 'aurora-headphones.svg' },
        right: { label: 'Speaker', image: 'pulse-speaker.svg' },
      },
    },
    {
      id: 'why',
      kicker: 'Headphones',
      headline: 'Built for long days',
      voiceoverText: 'Good over-ear headphones seal out noise and stay comfortable for hours.',
      visual: { type: 'bullets', items: ['Seals out noise', 'Bigger battery', 'All-day comfort'] },
    },
    {
      id: 'stat',
      kicker: 'Battery',
      headline: 'Charge once a week',
      voiceoverText: '[excited] Forty hours of playback. That is one charge a week.',
      visual: { type: 'stat', value: 40, suffix: 'h', label: 'of playback' },
    },
    {
      id: 'cta',
      kicker: 'Compare them all on',
      voiceoverText: '[warmly] Compare every model on our site.',
      visual: { type: 'cta', button: 'Go' },
    },
  ],
});
