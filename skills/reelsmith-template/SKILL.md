---
name: reelsmith-template
description: Design and build a new Reelsmith video template and its components from a company's visual guidelines — derive a motion/visual system from brand/guidelines.md, implement it in Remotion with brand tokens, register it, create an example job, and verify it with the review loop. Use when no shipped template fits the idea or the brand's look, or when the user asks for a new format/style.
---

# Building a brand-native template

The shipped templates (`ProductSpotlight`, `Explainer`, `TopList`,
`KineticCaptions`) are **examples**. Real brands deserve their own components:
derive them from `brand/guidelines.md`, don't reskin an example that fights the
brand. For Remotion API details also use the `remotion-best-practices` skill
(`npx skills add remotion-dev/skills`).

## 1. Design before code

Write a short design note (in your reply or the template's `README.md`):

1. **Visual system from the guidelines** — background treatment, type scale
   (display/body sizes, case), shape language (radius, borders, shadows),
   color roles per scene, imagery (cutouts, photos, illustrations), texture.
2. **Motion language** — entrance style (slide/pop/wipe/type-on), easing,
   durations (12–18 frames for entrances), one ambient motion per scene max.
3. **Beats** — list the scenes/beats with what is on screen in each and roughly
   how long. Sketch each as a single frame description; the review will render
   exactly these frames.
4. **Props** — the data the agent will fill in (keep it small and semantic:
   `headline`, `items`, `scenes[]` …; timing in seconds or `timedScene`).

## 2. File layout

```
src/templates/<TemplateId>/
  schema.ts        zod props (withBrand), defaults, timing helpers
  Composition.tsx  the React component
  index.ts         defineTemplate({ id, description, component, schema, defaultProps, durationInFrames, calculateMetadata, stills })
  README.md        optional design note
```

Register it in `src/templates/index.ts`. Reusable pieces used by 2+ templates go
in `src/components/`.

## 3. Skeleton

```ts
// schema.ts
import { z } from 'zod';
import { captionWord } from '../../core/captions';
import { musicSchema, sfxSchema } from '../../core/schemas';
import { timedScene } from '../../core/timeline';
import { withBrand } from '../../core/template';

export const myScene = z.object({
  ...timedScene, // id, from?, duration?, voiceover
  headline: z.string(),
  voiceoverText: z.string().default(''),
  captions: z.array(captionWord).default([]), // from `reelsmith voiceover`
});
export const myProps = withBrand({
  topic: z.string(),
  scenes: z.array(myScene).min(1),
  music: musicSchema,
  sfx: sfxSchema,
});
```

```tsx
// Composition.tsx
const { colors, font, alpha, price } = useBrand(); // ONLY source of style
const scenes = layoutScenes<MyScene>(props.scenes, 4 * fps); // from/duration resolved
// <Sequence from={s.from} durationInFrames={s.duration}> … </Sequence>
// <Voiceover file={s.voiceover} from={s.from} duration={s.duration} />
// <Captions words={s.captions} />  <Sfx file={props.sfx.swipe} at={s.from} master={props.sfx.volume} />
```

```ts
// index.ts — calculateMetadata sizes the video from the voiceover
calculateMetadata: async ({ props }) => {
  const scenes = await withVoiceoverDurations(props.scenes, VIDEO.fps, audioDurationSeconds);
  return { durationInFrames: timelineLength(layoutScenes(scenes, 4 * VIDEO.fps)), props: { ...props, scenes } };
},
stills: (props) => layoutScenes(props.scenes, 120).map((s) => s.from + Math.round(s.duration * 0.6)),
```

Look at `src/templates/Explainer` (narrated scenes) and
`src/templates/ProductSpotlight` (one continuous stage) as references.

## 4. Rules

- **Brand only through `useBrand()`**: `colors.*`, `font.display/body`,
  `alpha(color, a)`, `price()/priceParts()`. Literal colors/fonts are flagged by
  the review (`hardcoded-style`); neutral black/white shadows are fine.
- **Frame-driven animation only**: `useCurrentFrame()`, `interpolate`, `spring`.
  No CSS transitions/animations, no `Math.random()` (use `random(seed)`), no
  `Date.now()` — renders must be deterministic.
- **Safe areas**: key text inside `SAFE` (top 200, bottom 320, sides 90 on
  1080×1920); nothing important under the right action rail (x > 950, y 900–1600).
- **Legibility**: ≥ 28 px text (34 px+ preferred), contrast pairs that pass
  `pnpm reelsmith brand`, size variable text with `autoSize`/`fitParagraph`.
- **Assets**: images via `<ProductImage>` or `staticFile('products/…')`; audio via
  `<Sfx>`, `<Voiceover>`, `<Music>`. Never import files from outside `public/`.
- Purely decorative text (tickers, giant ghost numbers) gets
  `data-audit="decorative"` so the audit ignores it. Nothing else.
- Performance: prefer gradients over `filter: blur` on large layers.
- Remotion merges only top-level default props; always render through the CLI
  (it applies schema defaults) and give every nested field a default.

## 5. Ship it

1. `pnpm typecheck && pnpm test` (the tests check every template's defaults).
2. Add `examples/jobs/<slug>.json` (or `jobs/`) that shows the template off.
3. Optional: a catalog builder in `cli/lib/builders.ts` so `reelsmith make <Id>` works.
4. Run the **reelsmith-review** loop until it passes, then summarise the design
   note, rubric scores and score history.
