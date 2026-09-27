# Reelsmith

**AI-agent-first toolkit for on-brand short-form video** — TikTok, Instagram Reels
and YouTube Shorts, rendered with [Remotion](https://www.remotion.dev/).

You describe the video; a coding agent (Claude Code, Codex, Cursor, …) writes the
script, builds or picks a template **from your company's visual guidelines**,
generates the voiceover with word-synced captions, **grades its own frames**, fixes
what's wrong, and renders the MP4.

![Four example templates rendered with the demo brand](docs/assets/examples.jpg)

<sub>The four shipped example templates — `ProductSpotlight`, `Explainer`, `TopList`,
`KineticCaptions` — rendered with the demo brand. They are starting points; the
agent is meant to build templates that look like _your_ brand.</sub>

## What's in the box

- **Brand system** — one config (`reelsmith.config.ts`) with color tokens, fonts
  (any Google font or your own files), logo, locale and currency, plus
  `brand/guidelines.md` for voice, visual rules and claims policy. Any video can
  override the brand, so one install can serve several brands.
- **Job files** — a video is `jobs/<slug>.json` = `{ template, props }`, validated
  against a zod schema. `reelsmith describe <Template> --json` prints the JSON
  Schema so agents write valid jobs without reading source.
- **Data** — product catalog from JSON, CSV, or your own module (database, Shopify,
  API…). Prices and specs come from data, not from the model's memory.
- **Voiceover + captions** — ElevenLabs per-scene clips with character timestamps →
  word-level captions and scene durations written back into the job. Unchanged
  scenes are cached (you don't pay twice).
- **Review loop** — `reelsmith review` renders key frames with a DOM audit running
  inside the real render and grades them: clipped/off-canvas text, text hidden
  under TikTok/Reels UI, overlaps, tiny text, WCAG contrast, text that isn't
  actually painted, missing assets, speech cut off, reading speed, hook timing,
  hardcoded (off-brand) styles. Output: a score, an annotated contact sheet and a
  rubric for the agent's own visual judgement.
- **Agent skills** in the open [Agent Skills](https://agentskills.io) format:
  `reelsmith` (end-to-end workflow), `reelsmith-brand` (capture a brand from its
  website), `reelsmith-template` (design brand-native templates),
  `reelsmith-review` (verification loop).
- **Royalty-free SFX** synthesised from code, and demo assets you can redistribute.

## Quick start

Requirements: **Node 20+** and **pnpm** (`npm i -g pnpm` or `corepack enable`).
Remotion downloads its own headless Chrome and ships ffmpeg — nothing else to install.

```bash
git clone https://github.com/Flurin17/reelsmith.git
cd reelsmith
pnpm install
cp .env.example .env.local        # add ELEVENLABS_API_KEY for voiceovers (optional)

pnpm reelsmith list                                   # templates
pnpm reelsmith review examples/jobs/kinetic-desk-setup.json
pnpm reelsmith render examples/jobs/kinetic-desk-setup.json   # → out/kinetic-desk-setup.mp4
pnpm studio                                           # Remotion Studio for manual tweaks
```

Make your own:

```bash
pnpm reelsmith make TopList --category Audio --count 3      # from the catalog
pnpm reelsmith new Explainer my-guide                       # from template defaults
pnpm reelsmith voiceover jobs/my-guide.json                 # narration + captions + timing
pnpm reelsmith review jobs/my-guide.json                    # grade, then fix & repeat
pnpm reelsmith render jobs/my-guide.json
```

## Use it with an AI coding agent

The skills live in [`skills/`](skills/) and are already linked for agents working
inside this repo (`.claude/skills` for Claude Code, `.agents/skills` for Codex and
other agents, plus [`AGENTS.md`](AGENTS.md)). Just open the repo in your agent and
ask, e.g.:

> Set Reelsmith up for acme.com, then make a 20-second explainer about our three
> best-selling lamps and review it until it passes.

To use the skills from **another** project or globally:

```bash
# Any agent supported by the skills CLI (Claude Code, Codex, Cursor, Gemini CLI, …)
npx skills add Flurin17/reelsmith

# Claude Code plugin
/plugin marketplace add Flurin17/reelsmith
/plugin install reelsmith@reelsmith
```

Recommended companion skills:

```bash
npx skills add remotion-dev/skills      # Remotion best practices (animation, audio, fonts…)
npx skills add elevenlabs/skills        # ElevenLabs text-to-speech
```

## Make it yours

1. **Brand** — edit `reelsmith.config.ts` and `brand/guidelines.md` (or ask your agent
   to run the `reelsmith-brand` skill against your website). Check with
   `pnpm reelsmith brand`.
2. **Data** — point `catalog` at your JSON/CSV, or a module:
   ```ts
   // data/catalog.ts — any Node code (DB client, fetch, …)
   export default async function loadProducts() {
     return [{ id: 'sku-1', name: 'Lamp', price: 89, category: 'Lighting', image: 'https://…/lamp.png' }];
   }
   ```
   ```ts
   catalog: { type: 'module', path: 'data/catalog.ts' },
   images: { cutout: true },   // remove white studio backgrounds automatically
   ```
3. **Assets** — licensed music in `public/music/`, background footage in `public/bg/`,
   logo/fonts in `public/`. Keep third-party media out of git unless its license
   allows redistribution.
4. **Templates** — build brand-native ones in `src/templates/<Id>/` (see the
   `reelsmith-template` skill and the four examples).

## CLI

| Command                                           | What it does                                               |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `list`, `describe <T> [--json]`                   | Templates, props JSON Schema + example job                 |
| `brand`                                           | Brand tokens and a WCAG contrast check of every color pair |
| `catalog [--category x]`                          | Products from the configured catalog                       |
| `new <T> <slug>`, `make <T> …`                    | Create a job from defaults or catalog data                 |
| `validate <job…>`                                 | Validate job files                                         |
| `voiceover <job> [--scene] [--force] [--dry-run]` | TTS per scene + captions + durations                       |
| `stills <job> [--frames]`                         | Key frames + contact sheet                                 |
| `review <job> [--frames] [--json] [--strict]`     | Graded review, annotated sheet, report                     |
| `render <job…> [--draft]`                         | MP4 (checks assets first)                                  |
| `voices`, `audition <id[,id]>`                    | Find and compare ElevenLabs voices                         |
| `sfx`, `cutout <in> <out>`                        | Regenerate SFX, remove white backgrounds                   |

All commands: `pnpm reelsmith <command>`; run `pnpm reelsmith help` for flags.

## Project layout

```
reelsmith.config.ts   brand tokens, catalog source, voice settings
brand/guidelines.md   voice, visual rules, CTA + claims policy
src/core/             template contract, timeline, captions, frame audit
src/brand/            brand context, fonts, formatting
src/components/       shared pieces (CTA, captions, price, SFX, …)
src/templates/        the four example templates
cli/                  the reelsmith CLI (jobs, catalog, voiceover, review, render)
skills/               agent skills (+ references)
examples/             demo catalog and example jobs
public/               products, sfx, music, bg, voiceovers, fonts
```

## Licensing

Reelsmith's own code, the generated SFX and the demo artwork are **MIT**.
Reelsmith depends on **Remotion, which is not open source**: it is free for
individuals, non-profits and companies with up to 3 employees; larger companies
need a [Remotion company license](https://www.remotion.dev/license). Check it
before using Reelsmith commercially. ElevenLabs usage is billed by ElevenLabs.

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). New templates are
especially welcome when they show a genuinely different visual language.
