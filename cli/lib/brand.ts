/**
 * `reelsmith brand` — sanity-check brand tokens before rendering anything:
 * contrast of every foreground/background pair the templates use.
 */
import config from '../../reelsmith.config';
import { brandSchema, type BrandColors } from '../../src/brand/types';
import { contrastRatio } from '../../src/core/audit';

/** Pairs templates actually draw: [text token, background token, min ratio, where]. */
export const PAIRS: [keyof BrandColors, keyof BrandColors, number, string][] = [
  ['ink', 'paper', 4.5, 'body text on light pages'],
  ['ink', 'surface', 4.5, 'text on cards'],
  ['inkMuted', 'paper', 4.5, 'secondary text'],
  ['primary', 'surface', 4.5, 'kicker labels'],
  ['onPrimary', 'primary', 4.5, 'text on primary blocks'],
  ['onSecondary', 'secondary', 4.5, 'text on secondary blocks'],
  ['onNight', 'night', 4.5, 'text on dark templates'],
  ['onAccent', 'accent', 4.5, 'price badges / chips'],
  ['highlight', 'night', 3, 'highlight text on dark'],
  ['surface', 'ink', 4.5, 'inverted text'],
];

function rgba(color: string): [number, number, number, number] | null {
  const hex = color.trim().replace(/^#/, '');
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16), 1];
}

export function brandReport(): { lines: string[]; failures: number } {
  const brand = brandSchema.parse(config.brand);
  const lines = [
    `${brand.name} · ${brand.url} · ${brand.locale} · ${brand.currency}`,
    `fonts: display ${brand.fonts.display.family} (${brand.fonts.display.weights.join('/')}), body ${brand.fonts.body.family} (${brand.fonts.body.weights.join('/')})`,
    `logo: ${brand.logo || '(text wordmark)'}`,
    '',
    'contrast (WCAG):',
  ];
  let failures = 0;
  for (const [fg, bg, min, where] of PAIRS) {
    const a = rgba(brand.colors[fg]);
    const b = rgba(brand.colors[bg]);
    if (!a || !b) {
      lines.push(`  ?    ${fg} on ${bg}: non-hex color, check manually (${where})`);
      continue;
    }
    const ratio = contrastRatio(a, b);
    const ok = ratio >= min;
    if (!ok) failures++;
    lines.push(
      `  ${ok ? 'ok  ' : 'FAIL'} ${`${fg} on ${bg}`.padEnd(26)} ${ratio.toFixed(2).padStart(5)}:1 (min ${min}) — ${where}`,
    );
  }
  return { lines, failures };
}
