/**
 * Per-scene voiceover for any template whose props have `scenes[]` with `say`
 * (single voice) or `dialogue` (multi voice).
 *
 * For each scene it:
 *  1. skips unchanged scenes (content hash in public/voiceovers/<slug>/manifest.json),
 *  2. synthesises one MP3 per scene (keeps timing simple, lets you redo one scene),
 *  3. writes a compact sidecar <scene>.json (speech end + word timings) next to it,
 *  4. sets only `voiceover: "<slug>/<scene>.mp3"` in the job — durations and
 *     captions are read from the sidecar at render time, so jobs stay small.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import config from '../../reelsmith.config';
import type { VoiceConfig } from '../../src/config';
import { sidecarPath, stripAudioTags, toSidecarWords, type VoiceoverSidecar } from '../../src/core/captions';
import { PUBLIC, rel } from './env';
import { writeJob, type LoadedJob } from './jobs';
import { decodePcm, speechBounds } from './speech';
import { createProvider, type TtsProvider } from './tts';

interface SceneLike {
  id: string;
  say?: string;
  dialogue?: { speaker: string; text: string }[];
  voiceover?: string;
}

export interface VoiceoverOptions {
  scene?: string;
  force?: boolean;
  dryRun?: boolean;
}

/** What the TTS receives: emphasis markers removed, audio tags kept. */
export const spokenText = (say: string) => say.replace(/\*/g, '').replace(/\s+/g, ' ').trim();

function voiceConfig(): VoiceConfig {
  if (!config.voice) throw new Error('No `voice` section in reelsmith.config.ts');
  return config.voice;
}

function voiceIdFor(voice: VoiceConfig, key: string): string {
  const id = voice.voices[key];
  if (!id) throw new Error(`No voice "${key}" in config.voice.voices (have: ${Object.keys(voice.voices).join(', ')})`);
  return id;
}

function sceneHash(scene: SceneLike, voice: VoiceConfig): string {
  return createHash('sha1')
    .update(
      JSON.stringify({
        say: spokenText(scene.say ?? ''),
        dialogue: scene.dialogue ?? [],
        model: voice.model,
        lang: voice.languageCode,
        voices: voice.voices,
        settings: voice.settings,
      }),
    )
    .digest('hex')
    .slice(0, 16);
}

const speaks = (s: SceneLike) => Boolean(s.say?.trim()) || (s.dialogue?.length ?? 0) > 0;

export async function generateVoiceovers(job: LoadedJob, opts: VoiceoverOptions = {}): Promise<void> {
  const scenes = job.props.scenes as SceneLike[] | undefined;
  if (!Array.isArray(scenes))
    throw new Error(`${job.template} has no scenes[]; voiceover works on narrated templates.`);
  const voice = voiceConfig();
  const dir = join(PUBLIC, 'voiceovers', job.slug);
  const manifestPath = join(dir, 'manifest.json');
  const manifest: Record<string, string> = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : {};
  let provider: TtsProvider | null = null;
  let changed = false;

  for (const scene of scenes) {
    if (opts.scene && scene.id !== opts.scene) continue;
    const file = `${job.slug}/${scene.id}.mp3`;
    const abs = join(PUBLIC, 'voiceovers', file);

    if (!speaks(scene)) {
      // A hand-made clip without timings: write a sidecar from measured audio.
      if (scene.voiceover && existsSync(join(PUBLIC, 'voiceovers', scene.voiceover))) {
        const side = join(PUBLIC, 'voiceovers', sidecarPath(scene.voiceover));
        if (!existsSync(side) || opts.force) {
          const { speechEnd } = speechBounds(decodePcm(join(PUBLIC, 'voiceovers', scene.voiceover)));
          writeFileSync(side, JSON.stringify({ speechEnd: Number(speechEnd.toFixed(3)), words: [] }));
          console.log(`  ${scene.id}: measured ${scene.voiceover} (${speechEnd.toFixed(2)}s)`);
        }
      }
      continue;
    }

    const hash = sceneHash(scene, voice);
    if (!opts.force && manifest[scene.id] === hash && existsSync(abs) && scene.voiceover === file) {
      console.log(`  ${scene.id}: unchanged`);
      continue;
    }
    const preview = scene.dialogue?.length
      ? scene.dialogue.map((d) => `${d.speaker}: ${d.text}`).join(' / ')
      : spokenText(scene.say ?? '');
    if (opts.dryRun) {
      console.log(`  ${scene.id}: would say "${preview}"`);
      continue;
    }

    provider ??= createProvider(voice);
    const result = scene.dialogue?.length
      ? await provider.dialogue(
          scene.dialogue.map((d) => ({
            speaker: d.speaker,
            text: spokenText(d.text),
            voiceId: voiceIdFor(voice, d.speaker),
          })),
        )
      : await provider.speak(spokenText(scene.say!), voiceIdFor(voice, 'narrator'));

    mkdirSync(dir, { recursive: true });
    writeFileSync(abs, result.audio);
    const speechEnd = result.captions.length ? result.captions.at(-1)!.end : speechBounds(decodePcm(abs)).speechEnd;
    const sidecar: VoiceoverSidecar = {
      speechEnd: Number(speechEnd.toFixed(3)),
      words: toSidecarWords(result.captions),
    };
    writeFileSync(join(PUBLIC, 'voiceovers', sidecarPath(file)), JSON.stringify(sidecar));
    manifest[scene.id] = hash;
    scene.voiceover = file;
    changed = true;
    console.log(`  ${scene.id}: ${rel(abs)} · ${speechEnd.toFixed(2)}s · "${stripAudioTags(preview).slice(0, 60)}"`);
  }

  if (!changed || opts.dryRun) return;
  mkdirSync(dir, { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeJob(job.path, job);
  console.log(`✓ ${rel(job.path)} now references the clips; timings live in the sidecars`);
}
