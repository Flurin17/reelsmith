# Agent instructions

This repository is **Reelsmith**: a Remotion project for producing on-brand
TikTok / Reels / Shorts videos, designed to be operated by coding agents.

## Skills — read the one that matches your task

| Task                                         | Skill file                           |
| -------------------------------------------- | ------------------------------------ |
| Make or edit a video (default entry point)   | `skills/reelsmith/SKILL.md`          |
| Set up / fix the brand (colors, fonts, tone) | `skills/reelsmith-brand/SKILL.md`    |
| Build a new template or components           | `skills/reelsmith-template/SKILL.md` |
| Verify a video before delivering (always)    | `skills/reelsmith-review/SKILL.md`   |

The same skills are linked in `.claude/skills/` and `.agents/skills/`.

## Ground rules

- Brand first: read `brand/guidelines.md` and `reelsmith.config.ts` before writing copy or code.
- Styles only through `useBrand()` tokens; no literal colors/fonts in templates.
- Animations are frame-driven (`useCurrentFrame`, `interpolate`, `spring`); no CSS
  transitions, no `Math.random()` / `Date.now()`.
- Prices and product facts come from the catalog (`pnpm reelsmith catalog`).
- Never print, log or commit secrets (`.env.local`: `ELEVENLABS_API_KEY`, DB URLs).
- Run `pnpm reelsmith review <job>` and iterate until it passes before rendering
  or handing over a video.
- Before committing code: `pnpm typecheck && pnpm test`
  (`REELSMITH_RENDER_TESTS=1 pnpm test` also renders frames; CI does this).
- Don't commit `out/`, `jobs/` media outputs or third-party media without a
  redistribution license.
