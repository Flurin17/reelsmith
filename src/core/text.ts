/**
 * Data-responsive type sizing. Real product names and headlines vary a lot in
 * length, so font sizes shrink with the text instead of overflowing.
 */

/** Shrink a headline size for strings longer than `idealChars`. */
export function autoSize(text: string, max: number, min: number, idealChars = 11): number {
  const len = Math.max(text.trim().length, 1);
  if (len <= idealChars) return max;
  return Math.max(min, Math.round((max * idealChars) / len));
}

/** Pick a paragraph size that fills a target area but still fits. */
export function fitParagraph(text: string, opts: { min?: number; max?: number; fill?: number } = {}): number {
  const len = Math.max(text.trim().length, 1);
  const size = Math.round(Math.sqrt((opts.fill ?? 760000) / len));
  return Math.max(opts.min ?? 38, Math.min(opts.max ?? 92, size));
}

/** URL-safe slug ("Top 5 Headphones!" -> "top-5-headphones"). */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
