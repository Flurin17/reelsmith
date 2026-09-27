/**
 * `reelsmith brand [id]` — check a brand before rendering: resolved tokens and
 * the contrast of every text/background pair the primitives draw.
 */
import { BRANDS, DEFAULT_BRAND } from '../../brands';
import { contrastRatio } from '../../src/core/audit';
import { resolveTheme } from '../../src/theme/resolve';

function rgba(color: string): [number, number, number, number] | null {
  const hex = color.trim().replace(/^#/, '');
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16), 1];
}

/** [label, text color, background color, minimum ratio] for a brand. */
export function brandPairs(id: string): [string, string, string, number][] {
  const raw = BRANDS[id];
  if (!raw) throw new Error(`Unknown brand "${id}". Known: ${Object.keys(BRANDS).join(', ')}`);
  const t = resolveTheme(raw);
  const c = t.colors;
  const pairs: [string, string, string, number][] = [
    ['text on bg', c.text, c.bg, 4.5],
    ['muted on bg', c.muted, c.bg, 4.5],
    ['text on surface', c.text, c.surface, 4.5],
    ['onPrimary on primary', c.onPrimary, c.primary, 4.5],
    ['onAccent on accent', c.onAccent, c.accent, 4.5],
  ];
  t.tones.forEach((tn, i) => {
    pairs.push([`tone ${i}: text on bg`, tn.text, tn.bg, 4.5]);
    pairs.push([`tone ${i}: onAccent on accent`, tn.onAccent, tn.accent, 3]);
    if (tn.muted) pairs.push([`tone ${i}: muted on bg`, tn.muted, tn.bg, 3]);
  });
  return pairs;
}

export function brandReport(id = DEFAULT_BRAND): { lines: string[]; failures: number } {
  const raw = BRANDS[id];
  if (!raw) throw new Error(`Unknown brand "${id}". Known: ${Object.keys(BRANDS).join(', ')}`);
  const t = resolveTheme(raw);
  const lines = [
    `${t.id}: ${t.name} · ${t.url} · ${t.locale}/${t.currency}`,
    `fonts ${t.fonts.display.family} / ${t.fonts.body.family} · radius ${t.shape.radius} · shadow ${t.shape.shadow} · backdrop ${t.backdrop.kind} · reveal ${t.motion.reveal} · ${t.tones.length} tones`,
  ];
  let failures = 0;
  for (const [label, fg, bg, min] of brandPairs(id)) {
    const a = rgba(fg);
    const b = rgba(bg);
    if (!a || !b) {
      lines.push(`  ?    ${label}: non-hex color, check manually`);
      continue;
    }
    const r = contrastRatio(a, b);
    if (r < min) failures++;
    lines.push(`  ${r >= min ? 'ok  ' : 'FAIL'} ${label.padEnd(28)} ${r.toFixed(2).padStart(5)}:1 (min ${min})`);
  }
  return { lines, failures };
}
