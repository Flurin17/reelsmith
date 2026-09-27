/**
 * Schema building blocks shared across templates.
 */
import { z } from 'zod';

/**
 * Sound effects (files in public/sfx). `reelsmith sfx` synthesises a
 * royalty-free default set; set any slot to '' to mute it.
 */
export const sfxSchema = z
  .object({
    /** Opening impact. */
    hit: z.string().default('hit.wav'),
    /** Scene change. */
    swipe: z.string().default('swipe.wav'),
    /** Keystroke / small accent. */
    tick: z.string().default('tick.wav'),
    /** UI pop (buttons, pills). */
    pop: z.string().default('pop.wav'),
    /** Reward (price reveal). */
    ding: z.string().default('ding.wav'),
    /** Big intro impact. */
    boom: z.string().default('boom.wav'),
    /** Slide/zoom transition. */
    whoosh: z.string().default('whoosh.wav'),
    /** Build-up before the CTA. */
    riser: z.string().default('riser.wav'),
    /** Master volume for all SFX (0–1). */
    volume: z.number().min(0).max(1).default(0.55),
  })
  .prefault({});
export type SfxConfig = z.infer<typeof sfxSchema>;

/** Background music bed (file in public/music). */
export const musicSchema = z
  .object({
    file: z.string().default(''),
    volume: z.number().min(0).max(1).default(0.3),
  })
  .prefault({});
export type MusicConfig = z.infer<typeof musicSchema>;

/** A product as templates see it (already resolved by the CLI). */
export const productSchema = z.object({
  id: z.string().default(''),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  /** Short category / tag line, e.g. "Headphones". */
  category: z.string().default(''),
  description: z.string().default(''),
  /** Path inside public/ (e.g. 'brands/volt/products/can.svg') or URL. Empty = placeholder. */
  image: z.string().default(''),
});
export type ProductItem = z.infer<typeof productSchema>;
