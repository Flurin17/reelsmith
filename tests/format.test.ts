import { describe, expect, it } from 'vitest';
import { displayDomain, formatPrice, formatTotal, priceParts, withAlpha } from '../src/theme/format';

describe('formatPrice', () => {
  it('drops cents for whole prices and keeps them otherwise', () => {
    expect(formatPrice(39, 'en-US', 'USD')).toBe('$39');
    expect(formatPrice(39.9, 'en-US', 'USD')).toBe('$39.90');
  });

  it('follows the locale', () => {
    expect(formatPrice(1299.5, 'de-DE', 'EUR')).toBe('1.299,50 €');
    expect(formatPrice(149, 'de-CH', 'CHF')).toMatch(/^CHF\s149$/);
  });

  it('sums totals without float noise', () => {
    expect(formatTotal([14.9, 6.9, 4.5], 'en-US', 'USD')).toBe('$26.30');
  });
});

describe('priceParts', () => {
  it('splits symbol, major and minor parts', () => {
    expect(priceParts(1299.5, 'en-US', 'USD')).toEqual({
      currency: '$',
      major: '1,299',
      minor: '50',
      decimal: '.',
      currencyFirst: true,
    });
  });

  it('detects trailing currency', () => {
    const p = priceParts(39.9, 'de-DE', 'EUR');
    expect(p.currencyFirst).toBe(false);
    expect(p.decimal).toBe(',');
  });
});

describe('withAlpha', () => {
  it('converts hex colors to rgba', () => {
    expect(withAlpha('#ff0000', 0.5)).toBe('rgba(255,0,0,0.5)');
    expect(withAlpha('#0f0', 1)).toBe('rgba(0,255,0,1)');
  });

  it('passes other CSS colors through', () => {
    expect(withAlpha('rebeccapurple', 0.3)).toBe('rebeccapurple');
  });
});

describe('displayDomain', () => {
  it('strips protocol and trailing slash', () => {
    expect(displayDomain('https://Example.com/')).toBe('example.com');
  });
});
