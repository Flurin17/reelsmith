import { describe, expect, it } from 'vitest';
import { parseCsv, product, selectProducts } from '../cli/lib/catalog';

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, commas and CRLF', () => {
    const rows = parseCsv('id,name,price\r\n1,"Mug, large",12\r\n2,"The ""Best"" Lamp",89\r\n');
    expect(rows).toEqual([
      { id: '1', name: 'Mug, large', price: '12' },
      { id: '2', name: 'The "Best" Lamp', price: '89' },
    ]);
  });
});

describe('product schema', () => {
  it('coerces CSV strings', () => {
    const p = product.parse({ id: 7, name: 'Lamp', price: '89.5', available: 'no' });
    expect(p).toMatchObject({ id: '7', price: 89.5, available: false, category: '', image: '' });
  });
});

describe('selectProducts', () => {
  const catalog = [
    { id: 'a', name: 'Alpha', price: 30, category: 'Audio', description: '', image: '', available: true },
    { id: 'b', name: 'Bravo', price: 10, category: 'Audio', description: '', image: '', available: true },
    { id: 'c', name: 'Charlie', price: 20, category: 'Home', description: '', image: '', available: true },
    { id: 'd', name: 'Delta', price: 99, category: 'Audio', description: '', image: '', available: false },
  ];

  it('filters by category, hides unavailable items, sorts and limits', () => {
    const picked = selectProducts(catalog, { category: 'audio', sort: 'price-desc', count: 5 });
    expect(picked.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('keeps explicit id order', () => {
    expect(selectProducts(catalog, { ids: ['c', 'a'] }).map((p) => p.id)).toEqual(['c', 'a']);
  });

  it('fails loudly on unknown ids', () => {
    expect(() => selectProducts(catalog, { ids: ['zzz'] })).toThrow(/zzz/);
  });

  it('shuffles deterministically with a seed', () => {
    const a = selectProducts(catalog, { sort: 'random', seed: 42 }).map((p) => p.id);
    const b = selectProducts(catalog, { sort: 'random', seed: 42 }).map((p) => p.id);
    expect(a).toEqual(b);
  });
});
