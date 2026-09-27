/**
 * Product catalog: where product-driven templates get their data.
 *
 * Configure in reelsmith.config.ts:
 *   catalog: { type: 'json', path: 'data/products.json' }
 *   catalog: { type: 'csv', path: 'data/products.csv' }
 *   catalog: { type: 'module', path: 'data/catalog.ts' }  // default export: () => Promise<Product[]>
 *
 * Images are copied (or downloaded) into public/products so Remotion can
 * serve them; with `images.cutout`, white studio backgrounds are removed.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import config from '../../reelsmith.config';
import type { ProductItem } from '../../src/core/schemas';
import { slugify } from '../../src/core/text';
import { removeWhiteBackground } from './cutout';
import { PUBLIC, ROOT } from './env';

export const product = z.object({
  id: z.coerce.string().min(1),
  name: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  category: z.string().default(''),
  description: z.string().default(''),
  /** URL, path relative to the project root, or a file already in public/products. */
  image: z.string().default(''),
  /** false = excluded from lists (e.g. out of stock). */
  available: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === 'string' ? !['false', '0', 'no', ''].includes(v.trim().toLowerCase()) : v))
    .default(true),
});
export type Product = z.infer<typeof product>;

/** Minimal RFC 4180 CSV parser (quotes, escaped quotes, newlines in quotes). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (!header) return [];
  const keys = header.map((h) => h.trim());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

export async function loadCatalog(): Promise<Product[]> {
  const source = config.catalog;
  if (!source) throw new Error('No catalog configured. Add `catalog` to reelsmith.config.ts.');
  const abs = resolve(ROOT, source.path);
  if (!existsSync(abs)) throw new Error(`Catalog file not found: ${source.path}`);

  let rows: unknown[];
  if (source.type === 'json') rows = JSON.parse(readFileSync(abs, 'utf8'));
  else if (source.type === 'csv') rows = parseCsv(readFileSync(abs, 'utf8'));
  else {
    const mod = await import(pathToFileURL(abs).href);
    const load = mod.default ?? mod.loadProducts;
    if (typeof load !== 'function') throw new Error(`${source.path} must default-export () => Promise<Product[]>`);
    rows = await load();
  }
  if (!Array.isArray(rows)) throw new Error('Catalog must be an array of products');
  return rows.map((row, i) => {
    const parsed = product.safeParse(row);
    if (!parsed.success) throw new Error(`Catalog row ${i + 1} is invalid: ${parsed.error.issues[0]?.message}`);
    return parsed.data;
  });
}

export type Sort = 'price-desc' | 'price-asc' | 'name' | 'catalog' | 'random';
export const SORTS: Sort[] = ['price-desc', 'price-asc', 'name', 'catalog', 'random'];

/** Filter + sort + take — the selection logic behind list templates. */
export function selectProducts(
  products: Product[],
  opts: { category?: string; ids?: string[]; count?: number; sort?: Sort; seed?: number },
): Product[] {
  let list = products.filter((p) => p.available);
  if (opts.ids?.length) {
    const byId = new Map(products.map((p) => [p.id, p]));
    list = opts.ids.map((id) => {
      const found = byId.get(id);
      if (!found) throw new Error(`Product "${id}" is not in the catalog`);
      return found;
    });
  } else if (opts.category) {
    const needle = opts.category.toLowerCase();
    list = list.filter((p) => p.category.toLowerCase().includes(needle));
  }
  const sort = opts.sort ?? 'catalog';
  if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
  else if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
  else if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'random') list = seededShuffle(list, opts.seed ?? Date.now());
  return opts.count ? list.slice(0, opts.count) : list;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const a = [...items];
  let s = seed >>> 0;
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PRODUCTS_DIR = join(PUBLIC, 'products');

/**
 * Make a product image available under public/products and return its file
 * name there ('' when the product has no image).
 */
export async function resolveProductImage(p: Product, opts: { refresh?: boolean } = {}): Promise<string> {
  if (!p.image) return '';
  mkdirSync(PRODUCTS_DIR, { recursive: true });
  const base = slugify(p.id) || slugify(p.name);
  const cutout = Boolean(config.images?.cutout);

  // Already served from public/products.
  if (!p.image.includes('/') && existsSync(join(PRODUCTS_DIR, p.image)) && !cutout) return p.image;

  let ext = extname(new URL(p.image, 'file:///').pathname).toLowerCase() || '.png';
  const raw = join(PRODUCTS_DIR, `${base}.source${ext}`);
  if (/^https?:\/\//i.test(p.image)) {
    if (opts.refresh || !existsSync(raw)) {
      const res = await fetch(p.image);
      if (!res.ok) throw new Error(`Could not download image for ${p.id}: HTTP ${res.status}`);
      writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
    }
  } else {
    const src = [resolve(ROOT, p.image), join(PRODUCTS_DIR, p.image)].find((c) => existsSync(c));
    if (!src) {
      console.warn(`  ! image not found for ${p.id}: ${p.image} (rendering a placeholder)`);
      return '';
    }
    if (!cutout) {
      const name = `${base}${ext}`;
      if (resolve(src) !== join(PRODUCTS_DIR, name)) copyFileSync(src, join(PRODUCTS_DIR, name));
      return name;
    }
    copyFileSync(src, raw);
  }

  if (cutout && ext !== '.svg') {
    const out = `${base}.png`;
    if (opts.refresh || !existsSync(join(PRODUCTS_DIR, out))) await removeWhiteBackground(raw, join(PRODUCTS_DIR, out));
    return out;
  }
  const name = `${base}${ext}`;
  copyFileSync(raw, join(PRODUCTS_DIR, name));
  return name;
}

/** Catalog product → the ProductItem shape templates consume. */
export async function toItem(p: Product, opts: { refresh?: boolean } = {}): Promise<ProductItem> {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
    description: p.description,
    image: await resolveProductImage(p, opts),
  };
}
