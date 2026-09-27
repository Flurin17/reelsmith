# Agent instructions

Reelsmith: a Remotion repo for making on-brand TikTok / Reels / Shorts, operated by agents.
Start with `pnpm reelsmith context` (compact map). Skills (also in `.claude/skills`, `.agents/skills`):

| Task | Read |
| --- | --- |
| Make or edit a video | `skills/reelsmith/SKILL.md` |
| New brand, restyle, new template/component | `skills/reelsmith-design/SKILL.md` |
| Verify before delivering (always) | `skills/reelsmith-review/SKILL.md` |

Ground rules:

- Read `brands/<id>/guidelines.md` before writing copy; facts/prices only from the brand catalog.
- Styles only via `useTheme()` / `src/theme/primitives`; no literal colors or fonts in templates.
- Frame-driven animation only; no CSS transitions, `Math.random()`, `Date.now()`.
- Never print or commit secrets (`.env.local`).
- Review until it passes before rendering or handing over.
- Before committing code: `pnpm check` (`REELSMITH_RENDER_TESTS=1 pnpm test` also renders).
