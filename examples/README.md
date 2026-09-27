# Examples

- `catalog.json` — demo product catalog (the configured `catalog` in `reelsmith.config.ts`).
- `jobs/*.json` — one job per example template, all passing `pnpm reelsmith review`.

| Job                           | Template         | Look                                                 |
| ----------------------------- | ---------------- | ---------------------------------------------------- |
| `spotlight-aurora-headphones` | ProductSpotlight | Dark cinematic stage, kinetic hook, spotlight reveal |
| `explainer-headphones`        | Explainer        | Light editorial, narrated scenes, synced captions    |
| `top-5-desk-upgrades`         | TopList          | Bold flat colors, countdown, sticker prices          |
| `kinetic-desk-setup`          | KineticCaptions  | Faceless narrated reel, giant spoken words           |

The explainer ships with **placeholder captions** (evenly timed) so it previews
without an API key. Run `pnpm reelsmith voiceover examples/jobs/explainer-headphones.json`
with `ELEVENLABS_API_KEY` set to replace them with real narration and timings.

Everything here uses the demo brand "Lumen Supply" and hand-made SVG products, all
MIT-licensed.
