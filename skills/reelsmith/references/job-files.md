# Job files

```json
{
  "template": "Explainer",
  "props": { "topic": "headphones-guide", "scenes": [ … ] }
}
```

- Location: `jobs/<slug>.json` (examples live in `examples/jobs/`). The slug
  names the output (`out/<slug>.mp4`), the review folder (`out/review/<slug>/`)
  and the voiceover folder (`public/voiceovers/<slug>/`).
- `props` are validated against the template's zod schema. Fields with defaults
  can be omitted; `pnpm reelsmith describe <Template> --json` shows the schema
  (`"default"` marks optional fields) and a complete example.
- Every template accepts an optional per-video brand override:
  `"brand": { "name": "…", "url": "…", "colors": { "primary": "#…" } }`
  (fonts are config-only).

## Asset paths

| Prop               | Folder               |
| ------------------ | -------------------- |
| `image` (anywhere) | `public/products/`   |
| `voiceover`        | `public/voiceovers/` |
| `music.file`       | `public/music/`      |
| `sfx.*`            | `public/sfx/`        |
| `background(s)`    | `public/bg/`         |

Use file names relative to those folders. `pnpm reelsmith render` refuses to
render when a referenced file is missing (unless `--allow-missing`).

## Timing (scene-based templates)

- Scenes may omit `from` and `duration`: `duration` comes from the voiceover
  (measured) or the template default; `from` = end of the previous scene.
- After `reelsmith voiceover`, durations are written into the job so renders are
  reproducible.
- Template-specific timing (e.g. `seconds` in ProductSpotlight/TopList) is in
  seconds, not frames. Output is 1080×1920 at 30 fps.
