---
name: reelsmith-review
description: Verify and improve a Reelsmith video before delivering it — render key frames, run the automated grader (layout, legibility, contrast, platform safe zones, assets, voiceover timing, reading speed, brand lint), look at the annotated contact sheet, score the visual rubric, fix, and repeat until it passes. Use after creating or changing any job or template, and always before rendering a final MP4.
---

# Reelsmith review loop

Never hand over a video you have not reviewed. The loop is: **review → look →
score → fix → review again**, at most 5 rounds.

## 1. Run the grader

```bash
pnpm reelsmith review jobs/<slug>.json
```

It renders representative frames (one per scene/beat, plus 0.8 s for the hook)
with a DOM audit running inside the real render, then writes to
`out/review/<slug>/`:

| File                    | What it is                                                                        |
| ----------------------- | --------------------------------------------------------------------------------- |
| `report.md`             | Score, verdict, findings with frame numbers and fixes, frame table, visual rubric |
| `report.json`           | Same data, machine-readable (`--json` prints it)                                  |
| `sheet.png`             | Clean contact sheet with timestamps                                               |
| `sheet-annotated.png`   | Red boxes = errors, orange = warnings, dashed blue = platform UI zones            |
| `frames/`, `annotated/` | Full-size frames                                                                  |
| `history.json`          | Score per run — show the trend in your summary                                    |

Automated verdict: **PASS = no errors and score ≥ 80.** Use `--strict` to get a
non-zero exit code on failure (CI), `--frames 0,45,90` to inspect specific
moments such as transitions.

## 2. Look at the frames

Open `sheet-annotated.png`, then `sheet.png` (use whatever image-viewing ability
you have; open single frames from `frames/` when something is unclear). If you
cannot view images, say so explicitly, rely on `report.json`, and do not claim a
visual rubric score.

## 3. Score the visual rubric (1–5 each)

The script cannot judge taste — you must. Be honest; a 5 is rare.

| Criterion        | 5 =                                                         | 2 =                                                   |
| ---------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| Hook             | Frame 1 makes a clear claim/question in ≤ 6 big words       | Logo/name only, or text too small to read at a glance |
| Clarity          | One idea per scene; the main element is obvious in < 1 s    | Competing elements, walls of text                     |
| Brand fidelity   | Colors, type, shapes, tone match `brand/guidelines.md`      | Generic look, off-palette colors, wrong tone          |
| Composition      | Clear hierarchy, balanced, no dead zones or crowding        | Big empty areas, things jammed against edges          |
| Variety & pacing | Consecutive frames look different; nothing lingers          | Same layout every scene; scenes too long/short        |
| CTA              | Last frame shows exactly where to go, fully typed, on-brand | Truncated domain, hard sell, missing CTA              |

**Done when:** automated PASS **and** every criterion ≥ 3 **and** average ≥ 4.

## 4. Fix — most common findings

| Rule                              | Typical fix                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `text-off-canvas`, `text-clipped` | Size text to its box (`autoSize`, `fitParagraph`), shorten copy, allow wrapping                                                                  |
| `text-not-painted`                | Text is in the DOM but invisible: same color as its background, faded out, or a custom font loaded without `delayRender()` — use the brand fonts |
| `platform-ui-overlap`             | Move text inside `SAFE` (top 200 / bottom 320 / sides 90 px); nothing important under the right action rail                                      |
| `text-overlap`                    | Give elements their own space; check wordmark vs headline                                                                                        |
| `text-too-small`                  | ≥ 28 px, ideally 34 px+                                                                                                                          |
| `low-contrast`                    | Use token pairs that pass `pnpm reelsmith brand` (ink/paper, onPrimary/primary, …)                                                               |
| `asset-missing`, `image-missing`  | Add the file under `public/…` or fix the path                                                                                                    |
| `voiceover-missing`               | `pnpm reelsmith voiceover <job>` (info-only when no API key is configured — tell the user)                                                       |
| `speech-cut-off`                  | Re-run voiceover or raise the scene `duration`                                                                                                   |
| `reading-speed`                   | Cut on-screen words or lengthen the scene (≤ 3 words/s)                                                                                          |
| `no-hook-text`                    | Put the hook on screen by 0.8 s                                                                                                                  |
| `hardcoded-style`                 | Replace literal colors/fonts in the template with `useBrand()` tokens                                                                            |
| `duration`                        | Tighten to the length targets in the main skill                                                                                                  |

Fix the job first (copy, timing, assets); change template code only when the
problem is structural. After template changes, re-review **all** jobs using that
template (`examples/jobs/` too).

## 5. Rules of the loop

- Don't game the grader: never mark real content `data-audit="decorative"`, never
  shrink `SAFE`, never raise thresholds to pass.
- Warnings may stay only with a one-line justification in your summary (e.g. an
  intentional overlap in a logo lockup).
- Stop after 5 rounds and report what is left and why.
- In your final message include: score history, remaining warnings with reasons,
  your rubric scores, and the paths to `sheet.png` and the MP4.
