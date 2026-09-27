---
name: reelsmith-review
description: Verify and improve a Reelsmith video before delivering it — render audited key frames, get an automated score (layout, legibility, pixel contrast, platform safe zones, assets, voiceover timing, reading speed, brand lint), look at the one contact sheet, score the taste rubric, fix, repeat until it passes. Use after creating or changing any job, brand or template, and always before rendering a final MP4.
---

# Review loop

**review → look → score → fix → review**, at most 5 rounds. Never deliver unreviewed.

```bash
pnpm reelsmith review jobs/<slug>.json            # --frames 0,45 to inspect moments, --strict for CI
```

Prints the score, findings with frame numbers, and one image to look at:
`out/review/<slug>/sheet.png` (small tiles; frames with issues have boxes: red = error,
orange = warning, dashed blue = platform UI). Full-size frames are in `frames/`,
details in `report.md` / `report.json`, scores over time in `history.json`.
Automated **PASS = no errors and score ≥ 80**.

## Look and score (1–5 each)

View the sheet with your image-viewing ability (if you can't view images, say so and
rely on `report.json`; don't invent rubric scores).

| Criterion | 5 | 2 |
| --- | --- | --- |
| Hook | Clear claim/question in ≤ 6 big words at 0.8 s | Logo/name only, small text |
| Clarity | One idea per frame, obvious in < 1 s | Competing elements, walls of text |
| Brand fit | Matches `brands/<id>/guidelines.md` + theme | Generic, off-palette, wrong tone |
| Composition | Clear hierarchy, balanced, uses the frame | Dead zones, crowding, edges |
| Variety | Consecutive frames differ; pacing right | Same layout every beat |
| CTA | Domain fully typed, on-brand, clear | Truncated, hard sell, missing |

**Done:** automated PASS, every criterion ≥ 3, average ≥ 4.

## Fixes by rule

| Rule | Fix |
| --- | --- |
| `text-off-canvas` `text-clipped` | `fitSize()` the text, shorten copy, let containers grow |
| `text-not-painted` | Text invisible in pixels: same color as background, faded, or an un-awaited custom font |
| `low-contrast` | Measured against the real pixels behind the text: use tone pairs that pass `pnpm reelsmith brand <id>` |
| `platform-ui-overlap` | Move text inside `SAFE`; keep the right rail clear |
| `text-overlap` `text-too-small` | Separate elements; ≥ 28 px (phone UI excepted) |
| `asset-missing` `image-missing` | Path is relative to `public/`, or a URL |
| `speech-cut-off` `voiceover-missing` `no-captions` | Run/redo `pnpm reelsmith voiceover`; don't hand-set short durations |
| `reading-speed` `scene-too-short` `duration` | Cut words (≤ 3/s), merge scenes, stay 9–35 s |
| `no-hook-text` | Hook on screen by 0.8 s |
| `hardcoded-style` | Replace literals with `useTheme()` tokens |

Fix the job first (copy, timing, assets); touch theme or template code only for
structural problems, then re-review every job using that brand/template.

## Rules

- Don't game it: no fake `data-audit` markers, no shrinking `SAFE`, no threshold edits.
- A warning may stay only with a one-line reason in your summary.
- Final message: score history, remaining warnings + reasons, rubric scores, sheet + MP4 paths.
