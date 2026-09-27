# Voiceover with ElevenLabs

## How the pipeline works

- `pnpm reelsmith voiceover <job>` works on any template whose props have
  `scenes[]` with `voiceoverText` (single voice) or `dialogue` (multi voice).
- One MP3 per scene in `public/voiceovers/<slug>/<scene>.mp3` — never one long
  file; per-scene clips keep timing simple and let you regenerate one scene.
- The provider returns character timestamps; the CLI stores word-level
  `captions` and sets each scene's `duration` to the spoken length + a tail pad
  (`voice.tailPadding` in the config). Explicit `from` values are removed so
  scenes flow back to back (`--keep-from` keeps them).
- A content hash per scene lives in `manifest.json`; unchanged scenes are
  skipped. `--force` regenerates, `--scene <id>` targets one scene.

## Settings (reelsmith.config.ts → `voice`)

- `model`: `eleven_v3` (supports inline audio tags). `languageCode`: e.g. `en`, `de`.
- `voices`: `narrator` for single-voice scenes; dialogue `speaker` keys map here
  (e.g. `a`, `b`).
- Pick voices by listening, not by name:
  ```bash
  pnpm reelsmith voices --language en --gender female
  pnpm reelsmith voices --workspace
  pnpm reelsmith audition <voiceIdA>,<voiceIdB>     # → out/auditions/*.mp3
  ```
  Reject voices whose metadata language/accent does not match the video's
  language unless the user wants an accent.

## Writing for the ear

- Spoken lines can be longer than on-screen text, but keep scenes to one idea.
- Write numbers the way they should be spoken if the model mispronounces them
  ("forty hours").
- `eleven_v3` audio tags are square-bracket directions inside `voiceoverText`:
  `[curious]`, `[excited]`, `[confident]`, `[warmly]`, `[whispers]`, `[short pause]`.
  Use at most one per scene, usually at the start. They never appear on screen
  (captions strip them).
- Suggested defaults: hook `[curious]`/`[excited]`, explanation `[confident]` or
  none, CTA `[warmly]`.
- Tags are hints, not guarantees: regenerate only the affected scene and re-run
  the review after changing them.

## Cost control

Always `--dry-run` first on a new job. Regenerate single scenes instead of the
whole job. Never loop regenerations to "fix" delivery more than twice — report to
the user instead.
