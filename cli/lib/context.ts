/**
 * `reelsmith context` — one compact orientation for an agent: where to edit
 * what, the brands, the templates and the loop. Read this instead of the tree.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { BRANDS, DEFAULT_BRAND } from '../../brands';
import { TEMPLATES } from '../../src/templates';
import { resolveTheme } from '../../src/theme/resolve';
import { BUILDERS } from './builders';
import { catalogSource } from './catalog';
import { ROOT } from './env';

export function contextText(): string {
  const brands = Object.entries(BRANDS).map(([id, raw]) => {
    const t = resolveTheme(raw);
    const cat = catalogSource(id);
    const guide = existsSync(join(ROOT, 'brands', id, 'guidelines.md')) ? ' guidelines' : '';
    return `  ${`${id}${id === DEFAULT_BRAND ? '*' : ''}`.padEnd(10)} ${t.name} — ${t.tagline || t.url} · ${t.fonts.display.family}/${t.fonts.body.family} · ${t.backdrop.kind} · ${t.motion.reveal}${cat ? ` · catalog` : ''}${guide}`;
  });
  const templates = TEMPLATES.map(
    (t) =>
      `  ${t.id.padEnd(16)} ${t.description}${BUILDERS[t.id] ? `\n  ${''.padEnd(16)} make: ${BUILDERS[t.id].usage}` : ''}`,
  );
  return [
    'Reelsmith — what to edit:',
    '  brands/<id>/theme.ts         tokens (colors, tones, fonts, text, shape, motion, backdrop) + component overrides',
    '  brands/<id>/guidelines.md    voice, visual rules, CTA + claims policy (read before writing copy)',
    '  brands/<id>/products.json    catalog (or products.csv / catalog.ts module)',
    '  src/theme/primitives/        design system: Frame Backdrop Words Text Reveal Surface Chip Price Product',
    '                               Phone Counter Captions DomainCta Marquee Sfx Voiceover Music',
    '  src/templates/<Id>/index.tsx one file per template; register in src/templates/index.ts',
    '  jobs/<slug>.json             { "template", "props" } — props.brand picks the brand',
    '',
    `Brands (* default):`,
    ...brands,
    '',
    'Templates:',
    ...templates,
    '',
    'Loop: new|make → edit job → voiceover (if narrated) → review → fix → review → render',
    'Details: pnpm reelsmith describe <Template> · pnpm reelsmith brand <id> · skills/*/SKILL.md',
  ].join('\n');
}
