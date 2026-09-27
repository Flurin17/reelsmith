# Voiceover

- `pnpm reelsmith voiceover <job>` works on any template with `scenes[].say`
  (or `dialogue: [{ speaker, text }]` for multi-voice scenes).
- Writes `public/voiceovers/<slug>/<scene>.mp3` plus a tiny sidecar `<scene>.json`
  (speech end + word timings). The job only gains `"voiceover": "<slug>/<scene>.mp3"`;
  durations and captions are read from the sidecar at render time. Don't paste
  timings into jobs.
- Unchanged scenes are skipped (content hash). `--scene <id>` redoes one scene,
  `--force` all, `--dry-run` shows what would be said. Always dry-run first.

## Voices (reelsmith.config.ts → voice)

`model: 'eleven_v3'`, `languageCode`, `voices.narrator` (+ keys for dialogue
speakers). Choose by ear:

```bash
pnpm reelsmith voices --language en --gender female
pnpm reelsmith audition <voiceIdA>,<voiceIdB>        # → out/auditions/*.mp3
```

Reject voices whose metadata language/accent doesn't match the video.

## Writing `say`

- Emphasis `*…*` is stripped before synthesis (it only drives visuals).
- `eleven_v3` audio tags in square brackets: `[curious]`, `[excited]`, `[confident]`,
  `[warmly]`, `[softly]`, `[short pause]`. One per scene, usually at the start. Never
  shown on screen.
- Write numbers as they should be spoken if the model stumbles ("twenty-seven hundred").
- Max two regenerations per scene to fix delivery; then report to the user.
