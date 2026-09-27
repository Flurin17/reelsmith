/**
 * Locale/currency aware formatting. Pure functions (no React), so they are
 * shared by templates, the CLI, and tests.
 */

export interface PriceParts {
  /** Currency symbol or code as the locale prints it ("$", "CHF", "€"). */
  currency: string;
  /** Whole units, already grouped ("1,299"). */
  major: string;
  /** Fraction digits without separator ("50"), or '' for whole prices. */
  minor: string;
  /** Decimal separator of the locale ("." or ","). */
  decimal: string;
  /** Whether the locale puts the currency before the number. */
  currencyFirst: boolean;
}

function formatter(locale: string, currency: string, whole: boolean): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

const isWhole = (value: number) => Math.abs(value - Math.round(value)) < 0.005;

/** "$39", "$39.90", "CHF 149.50", "39,90 €" — whole prices drop the cents. */
export function formatPrice(value: number, locale: string, currency: string): string {
  return formatter(locale, currency, isWhole(value)).format(value);
}

/** Split a price into styled parts for badges (big major, small minor). */
export function priceParts(value: number, locale: string, currency: string): PriceParts {
  const parts = formatter(locale, currency, isWhole(value)).formatToParts(value);
  let major = '';
  let minor = '';
  let decimal = '.';
  let currencyText = currency;
  let currencyFirst = true;
  let seenNumber = false;
  for (const part of parts) {
    if (part.type === 'integer' || part.type === 'group') {
      major += part.value;
      seenNumber = true;
    } else if (part.type === 'fraction') minor = part.value;
    else if (part.type === 'decimal') decimal = part.value;
    else if (part.type === 'currency') {
      currencyText = part.value;
      currencyFirst = !seenNumber;
    }
  }
  return { currency: currencyText, major, minor, decimal, currencyFirst };
}

/** Sum prices and format the total (used by budget/bundle scenes). */
export function formatTotal(values: number[], locale: string, currency: string): string {
  const total = Math.round(values.reduce((sum, v) => sum + v, 0) * 100) / 100;
  return formatPrice(total, locale, currency);
}

/**
 * Apply an alpha to a hex color ("#rrggbb" / "#rgb"). Non-hex inputs (named
 * colors, rgb()) are returned unchanged so brands can use any CSS color.
 */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim().replace(/^#/, '');
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return color;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

/** Strip protocol + trailing slash and lowercase: the form typed on screen. */
export function displayDomain(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
    .toLowerCase();
}
