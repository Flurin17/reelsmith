/**
 * `reelsmith make <Template>`: build a job from a brand's catalog.
 * Templates without a builder start from `reelsmith new` instead.
 * Add a builder for your own template by adding an entry to BUILDERS.
 */
import { DEFAULT_BRAND } from '../../brands';
import { slugify } from '../../src/core/text';
import { loadCatalog, selectProducts, SORTS, toItem, type Sort } from './catalog';
import type { Job } from './jobs';

export interface BuildArgs {
  brand?: string;
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
 * Rough first cut of feature lines from a description: short clauses, max 3.
 * Agents should rewrite them in the brand's voice.
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
    usage: '--product <id> [--hook "Forty hours. *Zero* noise."]',
    async build(a) {
      if (!a.product) throw new Error('Pass --product <id> (see `reelsmith catalog`)');
      const brand = a.brand ?? DEFAULT_BRAND;
      const [p] = selectProducts(await loadCatalog(brand), { ids: [a.product] });
      const item = await toItem(p, { refresh: a.refresh });
      return {
        slug: `${brand}-spotlight-${slugify(p.id)}`,
        job: {
          template: 'ProductSpotlight',
          props: {
            brand,
            ...(a.hook ? { hook: a.hook } : {}),
            name: a.title ?? item.name,
            subtitle: a.subtitle ?? item.category,
            price: item.price,
            features: featureLines(item.description),
            image: item.image,
          },
        },
      };
    },
  },

  TopList: {
    usage: '[--category x] [--ids a,b] [--count 5] [--sort price-asc|price-desc|name|catalog|random]',
    async build(a) {
      const brand = a.brand ?? DEFAULT_BRAND;
      const count = Number(a.count ?? 5);
      if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error('--count must be 1–10');
      const picked = selectProducts(await loadCatalog(brand), {
        category: a.category,
        ids: a.ids
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        count,
        sort: parseSort(a.sort) ?? 'price-asc',
      });
      if (picked.length === 0) throw new Error(`No available products${a.category ? ` in "${a.category}"` : ''}`);
      const items = [];
      for (const p of picked) {
        const { description: _unused, ...item } = await toItem(p, { refresh: a.refresh });
        items.push(item);
      }
      const subtitle = a.subtitle ?? a.category ?? '';
      return {
        slug: `${brand}-top-${items.length}${subtitle ? `-${slugify(subtitle)}` : ''}`,
        job: { template: 'TopList', props: { brand, ...(a.title ? { title: a.title } : {}), subtitle, items } },
      };
    },
  },
};
