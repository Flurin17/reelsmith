import { z } from 'zod';
import { musicSchema, sfxSchema } from '../../core/schemas';
import { VIDEO, withBrand } from '../../core/template';

/**
 * Dark, cinematic single-product ad on one continuous stage: a kinetic hook
 * line, the product rising into a spotlight, feature chips, and a typed CTA.
 * The product never cuts away — it glides between poses, like a camera move.
 */
export const productSpotlightProps = withBrand({
  /** 2–6 word hook shown first. Wrap the key word in *asterisks* to highlight it. */
  hook: z.string().default(''),
  /** Product name. */
  name: z.string().min(1),
  /** Small line under the name, e.g. the category. */
  subtitle: z.string().default(''),
  price: z.number().nonnegative(),
  showPrice: z.boolean().default(true),
  /** 2–4 short feature lines (≤ 5 words each read best). */
  features: z.array(z.string()).max(4).default([]),
  /** File in public/products. Empty = placeholder. */
  image: z.string().default(''),
  ctaKicker: z.string().default('Discover more on'),
  /** Optional background video/image in public/bg; empty = animated brand glow. */
  background: z.string().default(''),
  /** Beat lengths in seconds. */
  seconds: z
    .object({
      hook: z.number().positive().default(2.2),
      reveal: z.number().positive().default(3.4),
      features: z.number().positive().default(5),
      cta: z.number().positive().default(3.8),
    })
    .prefault({}),
  music: musicSchema,
  sfx: sfxSchema,
});
export type ProductSpotlightProps = z.infer<typeof productSpotlightProps>;

/** Start frame of each beat plus the total length. */
export function spotlightTiming(seconds: ProductSpotlightProps['seconds']) {
  const f = (s: number) => Math.round(s * VIDEO.fps);
  const hook = 0;
  const reveal = hook + f(seconds.hook);
  const features = reveal + f(seconds.reveal);
  const cta = features + f(seconds.features);
  return { hook, reveal, features, cta, total: cta + f(seconds.cta) };
}

export const defaultProductSpotlightProps: ProductSpotlightProps = productSpotlightProps.parse({
  hook: 'Forty hours. *One* charge.',
  name: 'Aurora Headphones',
  subtitle: 'Wireless · Noise cancelling',
  price: 149,
  features: ['40 h battery', 'Adaptive noise cancelling', 'Memory-foam cushions'],
  image: 'aurora-headphones.svg',
});
