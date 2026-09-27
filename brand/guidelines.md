# Brand guidelines — Lumen Supply (demo brand)

> This file is the **human-readable half** of your brand. The machine-readable
> half (colors, fonts, locale, currency, domain) lives in `reelsmith.config.ts`.
> Coding agents read both before writing copy or designing components.
> Replace everything below with your company's guidelines — the
> `reelsmith-brand` skill can draft it from your website.

## 1. Identity

- **What we are:** An online shop for well-designed everyday objects (audio, lighting, kitchen, home).
- **Audience:** 22–40, design-conscious, buys a few good things instead of many cheap ones.
- **Primary goal of our videos:** Send viewers to `lumen-supply.example` to browse. Awareness first, sales second.
- **Where we post:** TikTok, Instagram Reels, YouTube Shorts (9:16).

## 2. Voice & tone

- Confident, warm, a little playful. Talk like a friend who knows products — never like a catalog.
- Short sentences. One idea per scene. Concrete numbers beat adjectives ("40 h battery", not "long-lasting").
- **Avoid:** hype words ("insane", "game-changer"), fake urgency ("only today!"), ALL CAPS in voiceover.
- Default language: English (US). Prices in USD, formatted by the locale.

## 3. Visual language

| Token                            | Use it for                                                   | Never                                   |
| -------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| `paper` / `surface`              | Backgrounds and cards in light layouts                       | Text                                    |
| `ink`                            | Text, hard outlines, offset shadows                          | Large background fills in light layouts |
| `primary` (burnt orange)         | The one thing to look at: badges, active states, CTA shadows | Body text                               |
| `secondary` (sun yellow)         | Highlights, price tags, underlines, sweeps                   | Text on paper (low contrast)            |
| `night` / `accent` / `highlight` | Dark cinematic layouts only                                  | Mixing with paper in one scene          |

- **Typography:** Display = Anton (condensed, uppercase headlines). Body = Montserrat 700–900. Max two weights per scene.
- **Shapes:** Square corners, 1–3 px ink borders, hard offset shadows (`10px 10px 0 <color>`). Rounded corners only on phone mockups and circular badges.
- **Imagery:** Product cutouts on flat color or paper. No stock photos of people. Products always have a drop shadow.
- **Texture:** A faint grid on paper is fine; no gradients except glows on dark layouts.

## 4. Motion

- Snappy ease-out (`Easing.bezier(0.16, 1, 0.3, 1)`), 12–18 frames for entrances.
- Springs only for "pop" moments (prices, stickers, badges).
- Every scene change gets a sound (swipe/whoosh); reveals get a ding or pop.
- Nothing moves just to move: at most one looping ambient motion per scene (sparkles, ticker, sweep).

## 5. Layout

- 1080×1920. Keep text inside the safe area (`SAFE` in `src/core/template.ts`): 90 px sides, 200 px top, 320 px bottom.
- Headline in the upper third, visual in the middle, captions just above the bottom safe line.
- Brand wordmark top-center on every video; domain pill near the bottom on editorial layouts.

## 6. Calls to action

- End every video on the domain being typed into a browser bar (`DomainTypeCta`) or an equivalent soft CTA.
- CTA copy: "See them all on", "Compare them on", "Discover more". Never "Buy now".

## 7. Claims & compliance

- Only state specs that are in the catalog description or on the product page.
- No comparisons with named competitors. No "best" claims without a source.
- Prices must come from the catalog at render time — never type them by hand.
