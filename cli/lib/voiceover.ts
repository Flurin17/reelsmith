/**
 * Per-scene voiceover generation for any template whose props have
 * `scenes[]` with `voiceoverText` (single voice) or `dialogue` (multi voice).
 *
 * For each scene it:
 *  1. skips unchanged scenes (content hash in public/voiceovers/<slug>/manifest.json),
 *  2. synthesises one MP3 per scene (never one long file — scene timing stays simple),
 *  3. stores word timings as `captions` and sets `duration` to fit the speech,
 *  4. writes the updated props back into the job file.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import config from '../../reelsmith.config';
import type { VoiceConfig } from '../../src/config';
import { stripAudioTags, type CaptionWord } from '../../src/core/captions';
import { VIDEO } from '../../src/core/template';
import { framesForAudio } from '../../src/core/timeline';
import { PUBLIC, rel } from './env';
import { writeJob, type LoadedJob } from './jobs';
import { decodePcm, speechBounds } from './speech';
import { createProvider, type TtsProvider } from './tts';

interface SceneLike {
  id: string;
  voiceoverText?: string;
  dialogue?: { speaker: string; text: string }[];
  voiceover?: string;
  captions?: CaptionWord[];
  duration?: number;
  from?: number;
}

export interface VoiceoverOptions {
  scene?: string;
  force?: boolean;
  dryRun?: boolean;
  /** Keep explicit `from` values instead of re-flowing scenes back-to-back. */
  keepFrom?: boolean;
}

function voiceConfig(): VoiceConfig {
  if (!config.voice) throw new Error('No `voice` section in reelsmith.config.ts');
  return config.voice;
}

function voiceIdFor(voice: VoiceConfig, key: string): string {
  const id = voice.voices[key];
  if (!id) throw new Error(`No voice "${key}" in config.voice.voices (have: ${Object.keys(voice.voices).join(', ')})`);
  return id;
}

/** Everything that changes the audio goes into the cache key. */
function sceneHash(scene: SceneLike, voice: VoiceConfig): string {
  return createHash('sha1')
    .update(
      JSON.stringify({
        text: scene.voiceoverText ?? '',
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

const hasSpeech = (s: SceneLike) => Boolean(s.voiceoverText?.trim()) || (s.dialogue?.length ?? 0) > 0;

export async function generateVoiceovers(job: LoadedJob, opts: VoiceoverOptions = {}): Promise<void> {
  const scenes = job.props.scenes as SceneLike[] | undefined;
  if (!Array.isArray(scenes))
    throw new Error(`${job.template} has no scenes[] — voiceover works on scene-based templates.`);
  const voice = voiceConfig();
  const tail = voice.tailPadding ?? 0.3;
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

    if (!hasSpeech(scene)) {
      // A hand-made clip without timings: measure it so the scene fits.
      if (scene.voiceover && existsSync(join(PUBLIC, 'voiceovers', scene.voiceover)) && scene.duration == null) {
        const { speechEnd } = speechBounds(decodePcm(join(PUBLIC, 'voiceovers', scene.voiceover)));
        scene.duration = framesForAudio(speechEnd, VIDEO.fps, tail);
        changed = true;
        console.log(`  ${scene.id}: measured ${scene.voiceover} → ${scene.duration}f`);
      }
      continue;
    }

    const hash = sceneHash(scene, voice);
    const upToDate = !opts.force && manifest[scene.id] === hash && existsSync(abs) && scene.voiceover === file;
    if (upToDate) {
      console.log(`  ${scene.id}: unchanged (cached)`);
      continue;
    }
    const preview = scene.dialogue?.length
      ? scene.dialogue.map((d) => `${d.speaker}: ${d.text}`).join(' / ')
      : (scene.voiceoverText ?? '');
    if (opts.dryRun) {
      console.log(`  ${scene.id}: would synthesise "${preview}"`);
      continue;
    }

    provider ??= createProvider(voice);
    const result = scene.dialogue?.length
      ? await provider.dialogue(
          scene.dialogue.map((d) => ({ speaker: d.speaker, text: d.text, voiceId: voiceIdFor(voice, d.speaker) })),
        )
      : await provider.speak(scene.voiceoverText!, voiceIdFor(voice, 'narrator'));

    mkdirSync(dir, { recursive: true });
    writeFileSync(abs, result.audio);
    manifest[scene.id] = hash;

    const speechEnd = result.captions.length ? result.captions.at(-1)!.end : speechBounds(decodePcm(abs)).speechEnd;
    scene.voiceover = file;
    scene.captions = result.captions;
    scene.duration = framesForAudio(speechEnd, VIDEO.fps, tail);
    changed = true;
    console.log(
      `  ${scene.id}: ${rel(abs)} · ${speechEnd.toFixed(2)}s speech → ${scene.duration}f · "${stripAudioTags(preview).slice(0, 60)}"`,
    );
  }

  if (!changed || opts.dryRun) return;
  if (!opts.keepFrom) for (const scene of scenes) delete scene.from;
  mkdirSync(dir, { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeJob(job.path, job);
  console.log(`✓ Updated ${rel(job.path)} (voiceover, captions, durations)`);
}
