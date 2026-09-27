/**
 * Product catalog: where product-driven templates get their data.
 *
 * Found per brand by convention (first match wins):
 *   brands/<id>/catalog.ts     default export: () => Promise<Product[]>  (DB, Shopify, API…)
 *   brands/<id>/products.json  array of products
 *   brands/<id>/products.csv   header: id,name,price,category,description,image,available
 * Fallback: `catalog` in reelsmith.config.ts.
 *
 * `image` may be a path inside public/, a path relative to the repo, or a URL;
 * non-public files are copied/downloaded into public/products (optionally with
 * white-background removal, `images.cutout`).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { DEFAULT_BRAND } from '../../brands';
import config from '../../reelsmith.config';
import type { CatalogConfig } from '../../src/config';
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
  /** Path inside public/, path relative to the repo, or URL. */
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

/** Catalog source for a brand (convention first, then the config fallback). */
export function catalogSource(brand = DEFAULT_BRAND): CatalogConfig | null {
  const dir = join(ROOT, 'brands', brand);
  const candidates: CatalogConfig[] = [
    { type: 'module', path: `brands/${brand}/catalog.ts` },
    { type: 'json', path: `brands/${brand}/products.json` },
    { type: 'csv', path: `brands/${brand}/products.csv` },
  ];
  return candidates.find((c) => existsSync(join(dir, c.path.split('/').pop()!))) ?? config.catalog ?? null;
}

export async function loadCatalog(brand?: string): Promise<Product[]> {
  const source = catalogSource(brand);
  if (!source) throw new Error(`No catalog for brand "${brand ?? DEFAULT_BRAND}". Add brands/<id>/products.json.`);
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
 * Return a path inside public/ for a product image ('' when none), copying or
 * downloading it into public/products when it isn't served yet.
 */
export async function resolveProductImage(p: Product, opts: { refresh?: boolean } = {}): Promise<string> {
  if (!p.image) return '';
  const cutout = Boolean(config.images?.cutout);
  const isUrl = /^https?:\/\//i.test(p.image);
  if (!isUrl && existsSync(join(PUBLIC, p.image)) && !cutout) return p.image;

  mkdirSync(PRODUCTS_DIR, { recursive: true });
  const base = slugify(p.id) || slugify(p.name);
  const ext = (extname(new URL(p.image, 'file:///').pathname).toLowerCase() || '.png').replace('.jpeg', '.jpg');
  const raw = join(PRODUCTS_DIR, `${base}.source${ext}`);
  if (isUrl) {
    if (opts.refresh || !existsSync(raw)) {
      const res = await fetch(p.image);
      if (!res.ok) throw new Error(`Could not download image for ${p.id}: HTTP ${res.status}`);
      writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
    }
  } else {
    const src = [join(PUBLIC, p.image), resolve(ROOT, p.image)].find((c) => existsSync(c));
    if (!src) {
      console.warn(`  ! image not found for ${p.id}: ${p.image} (placeholder will be rendered)`);
      return '';
    }
    copyFileSync(src, raw);
  }
  if (cutout && ext !== '.svg') {
    const out = `${base}.png`;
    if (opts.refresh || !existsSync(join(PRODUCTS_DIR, out))) await removeWhiteBackground(raw, join(PRODUCTS_DIR, out));
    return `products/${out}`;
  }
  copyFileSync(raw, join(PRODUCTS_DIR, `${base}${ext}`));
  return `products/${base}${ext}`;
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
