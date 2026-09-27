---
name: reelsmith-design
description: Create or change how Reelsmith videos look — add a brand (theme, guidelines, catalog) from a company's website or brand book, restyle it via tokens, tones or component overrides, and build new templates or components from the design-system primitives. Use when setting up a new company, when videos don't look like the brand, or when no template fits an idea.
---

# Brands, themes, templates

Three layers, cheapest first. Change the lowest layer that solves the problem.

| Layer | File | Controls |
| --- | --- | --- |
| Theme | `brands/<id>/theme.ts` | colors, tones, fonts, text styles, shape, motion, backdrop, component overrides |
| Primitives | `src/theme/primitives/` | shared building blocks every template uses |
| Templates | `src/templates/<Id>/index.tsx` | structure, beats, timing (one file each) |

## New brand (≈10 min)

1. **Gather facts** from the website/brand book (browser or `curl -sL <url>` + its CSS):
   colors (CSS variables, buttons, backgrounds), fonts (`font-family`, Google Fonts links),
   logo (header SVG), shape (radius, borders, shadow style), tone of voice, products, claims
   the site makes. Only real sources.
2. `cp -r brands/lumen brands/<id>` → edit `theme.ts` (required: `id name url colors fonts`;
   everything else has defaults — see `src/theme/types.ts`), rewrite `guidelines.md`
   (≤ 15 lines: what, voice, look, CTA, claims), replace `products.json` (or add
   `catalog.ts` exporting `async () => Product[]` for a DB/API). Logo/fonts/product images
   go in `public/brands/<id>/`.
3. Add one import line in `brands/index.ts`.
4. `pnpm reelsmith brand <id>` — every pair must say `ok`. If white text fails on your
   signature color, add a darker variant for `primary`/`accent` and keep the bright one in
   `tones` or `gradient`.
5. Check the look: `pnpm reelsmith new Explainer <id>-test --brand <id>` then review it.

Choosing tokens: `backdrop.kind` (`solid grid dots mesh spotlight rays`) and `grain`,
`motion.reveal` (`rise fade pop blur mask slide`), `motion.ease/enter/spring` (snappy vs
calm), `shape.radius/border/shadow` (`none soft hard glow`), `text.display.case/weight/
tracking`, `tones` = scene color schemes templates rotate through.

## Full control: override a primitive for one brand

```ts
// brands/acme/theme.ts
import { DefaultBackdrop } from '../../src/theme/primitives';
components: {
  Backdrop: (p) => <><DefaultBackdrop {...p} /><MyPattern /></>,   // wrap
  Price: MyPriceSticker,                                              // or replace
},
```

Overridable: `Backdrop Surface Chip Price Logo`. Anything else → new primitive or template.

## New template (one file)

Start from the closest example (`ProductSpotlight` = one continuous stage;
`Explainer`/`KineticCaptions` = narrated scenes; `AppPromo` = live UI in a phone).

```tsx
// src/templates/MyIdea/index.tsx
const scene = z.object({ ...sceneFields, headline: z.string() });      // id, say, voiceover…
const schema = jobProps({ scenes: z.array(scene).min(1), music: musicSchema, sfx: sfxSchema });
const MyIdea: React.FC<Props> = (p) => {
  const t = useTheme();                                   // ALL styling comes from here
  const scenes = placeScenes(p.scenes, VIDEO.fps);         // automatic timing
  return <AbsoluteFill>{scenes.map((s, i) => (
    <Sequence key={s.id} from={s.from} durationInFrames={s.duration}>
      <Frame tone={t.tone(i)}><Words text={s.headline} size={fitSize(t, s.headline, { width: 900, max: 140 })} /></Frame>
      <Captions words={sceneWords(s, VIDEO.fps)} tone={t.tone(i)} />
    </Sequence>))}</AbsoluteFill>;
};
export default defineTemplate<Props>({ id: 'MyIdea', description: '…', component: MyIdea, schema,
  example: {…minimal job…}, defaultProps: schema.parse(example), durationInFrames: 300,
  calculateMetadata: async ({ props }) => { const r = await resolveScenes(props.scenes, VIDEO.fps);
    return { durationInFrames: r.durationInFrames, props: { ...props, scenes: r.scenes } }; },
  stills: (props) => sceneStills(placeScenes(props.scenes, VIDEO.fps)) });
```

Register it in `src/templates/index.ts`, add `examples/jobs/<brand>-<idea>.json`, then run
**reelsmith-review** until it passes for at least two different brands.

## Primitives (src/theme/primitives)

`Frame` backdrop+logo+safe column · `Backdrop` · `Words` kinetic headline (`*emphasis*`) ·
`Text` · `Reveal` entrance wrapper · `Surface` card/glass/solid · `Chip` · `Price`
badge/tag/plain · `Product` image + glow/reflection/float · `Phone` live-UI mockup ·
`Counter` · `Captions` · `DomainCta` typed domain · `Marquee` ticker · `Sfx`/`Voiceover`/`Music`.
Helpers from `useTheme()`: `tone(i) type(variant) shadow() alpha() enter() pop() price()`;
`fitSize()` sizes text to a width with real font metrics.

## Rules

- Styles only via `useTheme()` / primitives — the review lints literal colors and fonts
  (pure black/white shadows are fine).
- Frame-driven animation only (`useCurrentFrame`, `interpolate`, `spring`, `t.enter/pop`);
  no CSS transitions, `Math.random()` or `Date.now()` (use `random(seed)`).
- Key text inside `SAFE` (sides 90, top 200, bottom 320 on 1080×1920), nothing important
  under the right action rail (x > 950, y 900–1600).
- ≥ 28 px text outside phone mockups (`data-audit="detail"` zones); decorative text
  (tickers, giant ghost numbers) gets `data-audit="decorative"` — nothing else.
- Every nested prop needs a default; render through the CLI (it applies them).
- For Remotion specifics, the `remotion-best-practices` skill helps if installed.
