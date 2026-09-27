---
name: reelsmith-brand
description: Capture a company's visual and verbal identity for Reelsmith — derive color tokens, fonts, logo, locale/currency and tone from its website or brand book, write them into reelsmith.config.ts and brand/guidelines.md, and verify contrast and look with renders. Use when setting Reelsmith up for a new company, when the demo brand "Lumen Supply" is still configured, or when the user says the videos don't look like their brand.
---

# Brand capture for Reelsmith

Reelsmith keeps the brand in two places:

- `reelsmith.config.ts` → `brand`: machine-readable tokens (colors, fonts, logo,
  domain, locale, currency). Every template reads them via `useBrand()`.
- `brand/guidelines.md`: the human-readable rules (voice, visual language,
  motion, layout, CTA, claims). Agents read it before writing copy or code.

Both must be filled from **real sources**, not guessed.

## 1. Gather sources (in this order)

1. Anything the user provides: brand book PDF, Figma, style guide, logo files.
2. The company website. With a browser tool, visit the homepage and 1–2 key
   pages; otherwise `curl -sL <url>` and the linked CSS files. Collect:
   - CSS custom properties (`--color-*`, `--brand-*`), and the most-used
     background, text, button and accent colors.
   - `font-family` declarations and Google Fonts `<link>`s (or `@font-face` files).
   - The logo: header `<svg>`/`<img>`, `/logo.svg`, favicon/apple-touch-icon as last resort.
   - Shape language: border radius, borders, shadow style (soft vs. hard offset).
   - Tone: headlines, CTAs, how they address customers (du/Sie, you/we), emoji use.
   - Facts you may state: products, locations, delivery/pickup, payment, hours.
     Only what the site says.
3. If the project has a company-facts document, read it too.

## 2. Map to tokens

| Token                                 | Pick                                                    |
| ------------------------------------- | ------------------------------------------------------- |
| `paper`, `surface`, `muted`, `border` | Page background, card background, subtle fill, hairline |
| `ink`, `inkMuted`                     | Main and secondary text on light backgrounds            |
| `primary` / `onPrimary`               | Signature brand color + readable text on it             |
| `secondary` / `onSecondary`           | Supporting accent + readable text on it                 |
| `night` / `onNight`                   | Dark background for cinematic templates + text on it    |
| `accent` / `onAccent`                 | Badge/price color on dark + its text                    |
| `highlight`                           | Glow/sparkle/emphasis color on dark                     |

Fonts: `display` (headlines) and `body`. Google fonts work by family name; for
licensed fonts put `.woff2` files in `public/fonts/` and use
`{ family, source: 'local', src: 'fonts/X.woff2', weights: ['700'] }`.
Locale and currency drive price formatting (`de-CH` + `CHF` → "CHF 149").
Logo: SVG in `public/`, set `logo: 'logo.svg'` (it is tinted white on dark scenes).

## 3. Verify the tokens

```bash
pnpm reelsmith brand
```

Every pair must print `ok`. When a brand color fails with white text, create a
darker variant for the `primary`/`accent` token and keep the original bright
color for `secondary`/`highlight` — don't break contrast to match a hex exactly.

## 4. Write `brand/guidelines.md`

Replace the demo content section by section (identity, voice & tone, visual
language table, motion, layout, CTA rules, claims & compliance). Be concrete:
words to use/avoid, CTA order, which color is used for what, what may never be
claimed. Cite where each rule came from if it's not obvious.

## 5. Check the look

```bash
pnpm reelsmith review examples/jobs/explainer-headphones.json
pnpm reelsmith review examples/jobs/kinetic-desk-setup.json
```

Look at the sheets: does it feel like the brand? If the shipped templates are
structurally wrong for this brand (e.g. rounded, soft, photographic brand vs.
the hard-edged examples), note it and build brand-native templates with the
**reelsmith-template** skill. Swap the demo catalog (`examples/catalog.json`)
for real data via `catalog` in the config (JSON, CSV, or a module that queries a
database/API).
