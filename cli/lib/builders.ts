/**
 * `reelsmith make <Template>` builders: turn catalog data into a job file.
 * Templates without a builder start from `reelsmith new` instead.
 *
 * Add a builder for your own template by adding an entry to BUILDERS.
 */
import { slugify } from '../../src/core/text';
import { loadCatalog, selectProducts, SORTS, toItem, type Sort } from './catalog';
import type { Job } from './jobs';

export interface BuildArgs {
  product?: string;
  hook?: string;
  ids?: string;
  category?: string;
  count?: string;
  sort?: string;
  title?: string;
  subtitle?: string;
  refresh?: boolean;
}

export interface Builder {
  usage: string;
  build(args: BuildArgs): Promise<{ job: Job; slug: string }>;
}

function parseSort(sort?: string): Sort | undefined {
  if (sort && !SORTS.includes(sort as Sort)) throw new Error(`--sort must be one of: ${SORTS.join(', ')}`);
  return sort as Sort | undefined;
}

/**
 * Rough first cut of feature chips from a description: split into clauses and
 * keep up to three short ones. Agents should rewrite them per the brand voice.
 */
export function featureLines(description: string): string[] {
  return description
    .split(/[.;!?]|,\s+|\s+and\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && s.split(/\s+/).length <= 6)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .slice(0, 3);
}

export const BUILDERS: Record<string, Builder> = {
  ProductSpotlight: {
    usage: '--product <id> [--hook "Forty hours. *One* charge."]',
    async build(args) {
      if (!args.product) throw new Error('Pass --product <id> (see `reelsmith catalog`)');
      const [p] = selectProducts(await loadCatalog(), { ids: [args.product] });
      const item = await toItem(p, { refresh: args.refresh });
      return {
        slug: `spotlight-${slugify(p.id)}`,
        job: {
          template: 'ProductSpotlight',
          props: {
            hook: args.hook ?? '',
            name: args.title ?? item.name,
            subtitle: args.subtitle ?? item.category,
            price: item.price,
            features: featureLines(item.description),
            image: item.image,
          },
        },
      };
    },
  },

  TopList: {
    usage:
      '[--category <text>] [--ids a,b,c] [--count 5] [--sort price-desc|price-asc|name|catalog|random] [--title] [--subtitle]',
    async build(args) {
      const count = Number(args.count ?? 5);
      if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error('--count must be 1–10');
      const picked = selectProducts(await loadCatalog(), {
        category: args.category,
        ids: args.ids
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        count,
        sort: parseSort(args.sort) ?? 'price-asc',
      });
      if (picked.length === 0)
        throw new Error(`No available products match${args.category ? ` category "${args.category}"` : ''}`);
      const items = [];
      for (const p of picked) items.push(await toItem(p, { refresh: args.refresh }));
      const subtitle = args.subtitle ?? args.category ?? '';
      return {
        slug: `top-${items.length}${subtitle ? `-${slugify(subtitle)}` : ''}`,
        job: { template: 'TopList', props: { title: args.title ?? `Top ${items.length}`, subtitle, items } },
      };
    },
  },
};
