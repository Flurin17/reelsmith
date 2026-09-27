---
name: reelsmith
description: Make on-brand short-form vertical videos (TikTok, Reels, Shorts) in a Reelsmith repo — pick brand + template, write the job, add voiceover, review, render. Use for any request to create, edit or batch a reel, TikTok, short, product video, explainer, app promo or video ad in a repository containing brands/ and reelsmith.config.ts.
---

# Making a reel

Everything runs through `pnpm reelsmith <command>` (non-interactive, prints paths).
Other skills: **reelsmith-design** (new brand, theme, template or component),
**reelsmith-review** (mandatory before delivering).

## 1. Orient (one command)

```bash
pnpm reelsmith context        # brands, templates, what to edit where
```

Then read `brands/<brand>/guidelines.md` (voice, look, CTA, what never to claim).
No fitting brand? → **reelsmith-design**. No `node_modules`? → `pnpm install`.

## 2. Plan in one paragraph

Goal, brand, template, length (product 9–15 s · explainer 20–35 s), hook (≤ 6 words,
on screen by 0.8 s), 3–5 beats, CTA. Craft notes: `references/short-form.md`.
If no template fits the idea or the brand's look, build one (**reelsmith-design**).

## 3. Write the job

```bash
pnpm reelsmith describe <Template>          # compact props + example (≈600 tokens)
pnpm reelsmith new <Template> <slug> --brand <id>                  # minimal example job
pnpm reelsmith make TopList --brand volt --count 5                 # or: from the catalog
pnpm reelsmith make ProductSpotlight --brand nocturne --product nocturne-one --hook "…"
```

Edit `jobs/<slug>.json`. Rules:

- Facts and prices only from the brand catalog (`pnpm reelsmith catalog --brand <id>`).
- One idea per scene; on-screen text shorter than what is said.
- `*word*` marks emphasis in headlines, hooks and `say`.
- Narrated scenes need only `id` + `say`; timing is automatic (voiceover length, or word count).

## 4. Voiceover (narrated templates)

```bash
pnpm reelsmith voiceover jobs/<slug>.json --dry-run
pnpm reelsmith voiceover jobs/<slug>.json            # one clip per scene; unchanged scenes skipped
pnpm reelsmith voiceover jobs/<slug>.json --scene hook
```

Needs `ELEVENLABS_API_KEY` in `.env.local` (never print it). Without a key, build and
review silently and tell the user. Voices and audio tags: `references/voiceover.md`.

## 5. Review → fix → review (reelsmith-review)

```bash
pnpm reelsmith review jobs/<slug>.json
```

## 6. Render and report

```bash
pnpm reelsmith render jobs/<slug>.json      # → out/<slug>.mp4  (--draft for a fast half-size check)
```

Report: MP4 path, length, review score history, the narration, and anything left
for the user (e.g. licensed music in `public/music/`, set `music.file` in the job).
