---
name: reelsmith
description: Produce on-brand short-form vertical videos (TikTok, Instagram Reels, YouTube Shorts) with a Reelsmith project — concept, script, job file, ElevenLabs voiceover with synced captions, automated review, and MP4 render. Use whenever the user asks to make, edit, or batch a reel, TikTok, short, product video, explainer or video ad in a repository that contains reelsmith.config.ts.
---

# Reelsmith — making a reel end to end

Reelsmith is a Remotion project driven by **job files** (`jobs/<slug>.json`) and a
CLI (`pnpm reelsmith …`). Every command is non-interactive and prints file paths,
so you can run the whole pipeline yourself.

Companion skills (same folder as this one):

| Skill                | Use it when                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `reelsmith-brand`    | The brand is still the demo ("Lumen Supply") or `brand/guidelines.md` is missing/outdated. |
| `reelsmith-template` | No shipped template fits the idea or the brand's visual language — build your own.         |
| `reelsmith-review`   | **Always**, before you show or render a final video.                                       |

## 0. Check the setup (once per session)

```bash
node -v                      # needs 20+
pnpm install                 # if node_modules is missing
pnpm reelsmith list          # templates
pnpm reelsmith brand         # brand tokens + contrast
```

Voiceover needs `ELEVENLABS_API_KEY` in `.env.local` (copy `.env.example`).
Never print, log or commit secrets. If the key is missing, you can still build and
review silent videos; tell the user narration is pending.

## 1. Load the brand context — never skip

1. Read `brand/guidelines.md` (voice, visual rules, CTA rules, claims policy).
2. Read the `brand` block of `reelsmith.config.ts` (colors, fonts, locale, currency, domain).
3. If the brand is still the demo brand, or the user names another company, run the
   **reelsmith-brand** skill first.

Everything you write (copy, colors, claims, CTA) must follow those two files.

## 2. Brief and concept

Pin down (ask only what you cannot infer): goal (awareness / traffic / sale),
product or topic, platform, language, target length. Then write a one-paragraph
concept with: hook (first 1–2 s), the 3–5 beats, CTA. See
`references/short-form.md` for hooks, pacing and length defaults. If you can
browse, spend a minute checking current platform best practices.

## 3. Pick the format

```bash
pnpm reelsmith list
pnpm reelsmith describe <Template> --json   # JSON Schema + example job
```

Shipped templates are **examples of four distinct looks** (dark cinematic
spotlight, light editorial explainer, bold countdown, kinetic captions). If none
matches the idea _and_ the brand's visual language, build a new template with
**reelsmith-template** — that is expected, not a last resort.

## 4. Create the job

- From catalog data: `pnpm reelsmith make ProductSpotlight --product <id> --hook "…"`
  or `pnpm reelsmith make TopList --category <text> --count 5`.
- From scratch: `pnpm reelsmith new <Template> <slug>`, then edit `jobs/<slug>.json`.
- Check it: `pnpm reelsmith validate jobs/<slug>.json`.

Rules: prices and specs come from the catalog (`pnpm reelsmith catalog`), never
from memory. One idea per scene. On-screen text is shorter than the narration.
Details: `references/job-files.md`.

## 5. Voiceover (narrated templates)

```bash
pnpm reelsmith voiceover jobs/<slug>.json --dry-run   # see what will be synthesised
pnpm reelsmith voiceover jobs/<slug>.json             # one MP3 per scene + captions + durations
pnpm reelsmith voiceover jobs/<slug>.json --scene hook   # regenerate one scene only
```

The command writes `voiceover`, `captions` (word timings) and `duration` back into
the job, and skips unchanged scenes (cost control). Voice/tag guidance:
`references/voiceover.md`.

## 6. Review — mandatory

Follow **reelsmith-review**: `pnpm reelsmith review jobs/<slug>.json`, look at the
contact sheets, fix, repeat until it passes.

## 7. Render and deliver

```bash
pnpm reelsmith render jobs/<slug>.json --draft   # fast half-res check (optional)
pnpm reelsmith render jobs/<slug>.json           # final → out/<slug>.mp4
```

Report back: output path, length, the final review score (and its history), the
narration script, and anything the user must still do (e.g. add a licensed music
track in `public/music/`).

## Command cheat sheet

| Command                                                         | Purpose                                           |
| --------------------------------------------------------------- | ------------------------------------------------- |
| `list` / `describe <T> [--json]`                                | Templates and their props schema                  |
| `brand`                                                         | Tokens + contrast matrix                          |
| `catalog [--category x] [--json]`                               | Products available to templates                   |
| `new <T> <slug>` / `make <T> …`                                 | Create a job                                      |
| `validate <job…>`                                               | Schema check                                      |
| `voiceover <job> [--scene id] [--force] [--dry-run]`            | TTS + captions + durations                        |
| `stills <job> [--frames 0,90]`                                  | Quick key frames + contact sheet                  |
| `review <job> [--frames …] [--json] [--strict]`                 | Graded review with annotated frames               |
| `render <job…> [--draft]`                                       | MP4                                               |
| `voices [--language de --gender female]` / `audition <id[,id]>` | Pick voices                                       |
| `sfx` / `cutout <in> <out>`                                     | Regenerate SFX / remove white product backgrounds |

`pnpm studio` opens Remotion Studio for manual tweaking (for humans; agents should
prefer `stills`/`review`).
