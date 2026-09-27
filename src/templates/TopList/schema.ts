import { z } from 'zod';
import { musicSchema, productSchema, sfxSchema } from '../../core/schemas';
import { VIDEO, withBrand } from '../../core/template';

/**
 * Bold "Top N" countdown: flat full-bleed color panels, giant outlined rank
 * numbers, products on sticker discs, ending on a typed-domain CTA.
 */
export const topListProps = withBrand({
  /** Big intro headline. Defaults to "Top <n>". */
  title: z.string().default(''),
  /** Category / theme line under the title. */
  subtitle: z.string().default(''),
  /** Items in display order; the LAST one is revealed as #1. */
  items: z.array(productSchema).min(1).max(10),
  showPrice: z.boolean().default(true),
  ctaKicker: z.string().default('See them all on'),
  ctaButton: z.string().default('Go'),
  seconds: z
    .object({
      intro: z.number().positive().default(2),
      item: z.number().positive().default(2.4),
      cta: z.number().positive().default(4.5),
    })
    .prefault({}),
  music: musicSchema,
  sfx: sfxSchema,
});
export type TopListProps = z.infer<typeof topListProps>;

export function topListTiming(props: Pick<TopListProps, 'seconds' | 'items'>) {
  const f = (s: number) => Math.round(s * VIDEO.fps);
  const intro = f(props.seconds.intro);
  const item = f(props.seconds.item);
  const cta = f(props.seconds.cta);
  const ctaAt = intro + item * props.items.length;
  return { intro, item, cta, ctaAt, total: ctaAt + cta };
}

export const defaultTopListProps: TopListProps = topListProps.parse({
  subtitle: 'Desk upgrades',
  items: [
    { id: 'drift-mug', name: 'Drift Mug', price: 18, category: 'Kitchen', image: 'drift-mug.svg' },
    { id: 'terra-planter', name: 'Terra Planter', price: 39, category: 'Home', image: 'terra-planter.svg' },
    { id: 'orbit-lamp', name: 'Orbit Lamp', price: 89, category: 'Lighting', image: 'orbit-lamp.svg' },
    { id: 'pulse-speaker', name: 'Pulse Speaker', price: 119, category: 'Audio', image: 'pulse-speaker.svg' },
    {
      id: 'aurora-headphones',
      name: 'Aurora Headphones',
      price: 149,
      category: 'Audio',
      image: 'aurora-headphones.svg',
    },
  ],
});
