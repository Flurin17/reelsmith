/**
 * Find and audition ElevenLabs voices. Needs an API key with `voices_read`.
 * Prints ids + metadata only — never the key.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import config from '../../reelsmith.config';
import { requireEnv } from './env';

type AnyVoice = Record<string, any>;

function client() {
  return new ElevenLabsClient({ apiKey: requireEnv('ELEVENLABS_API_KEY', 'Add it to .env.local (see .env.example).') });
}

function describe(v: AnyVoice) {
  const labels = v.labels ?? {};
  return {
    name: v.name,
    id: v.voiceId ?? v.voice_id,
    meta: [
      v.gender ?? labels.gender,
      v.language ?? labels.language,
      v.accent ?? labels.accent,
      v.age ?? labels.age,
      v.useCase ?? labels.use_case,
    ]
      .filter(Boolean)
      .join(' / '),
    description: String(v.description ?? '')
      .replace(/\s+/g, ' ')
      .trim(),
    preview: v.previewUrl ?? v.preview_url ?? '',
  };
}

function print(title: string, voices: AnyVoice[], json: boolean) {
  const rows = voices.map(describe);
  if (json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  console.log(`\n${title}`);
  if (rows.length === 0) console.log('  (none)');
  for (const r of rows) {
    console.log(
      `- ${r.name}\n  id: ${r.id}${r.meta ? `\n  meta: ${r.meta}` : ''}${r.description ? `\n  desc: ${r.description}` : ''}`,
    );
  }
}

/** Voices already in your ElevenLabs workspace. */
export async function workspaceVoices(opts: { search?: string; json?: boolean }) {
  const res = await client().voices.search({ pageSize: 50, search: opts.search, includeTotalCount: false });
  print('Workspace voices', res.voices ?? [], Boolean(opts.json));
}

/** The shared voice library, filtered for a language/gender. */
export async function libraryVoices(opts: {
  language?: string;
  gender?: string;
  search?: string;
  useCase?: string;
  limit?: number;
  json?: boolean;
}) {
  const res = await client().voices.getShared({
    language: opts.language ?? config.voice?.languageCode ?? 'en',
    gender: opts.gender,
    search: opts.search,
    useCases: opts.useCase ? [opts.useCase] : undefined,
    pageSize: opts.limit ?? 12,
    sort: 'cloned_by_count',
  });
  print('Library voices', res.voices ?? [], Boolean(opts.json));
}

/** Render a short line per voice (or a two-voice exchange) to compare them. */
export async function audition(opts: { voices: string[]; text?: string; out: string }) {
  const voice = config.voice;
  if (!voice) throw new Error('No `voice` section in reelsmith.config.ts');
  const c = client();
  const text = opts.text ?? '[excited] Three things you should know before you buy. Number one might surprise you.';
  const audio =
    opts.voices.length >= 2
      ? await c.textToDialogue.convert({
          inputs: opts.voices.map((voiceId, i) => ({
            voiceId,
            text: i % 2 === 0 ? text : '[curious] Wait, really? Tell me more.',
          })),
          modelId: voice.model,
          languageCode: voice.languageCode,
        })
      : await c.textToSpeech.convert(opts.voices[0], { text, modelId: voice.model, languageCode: voice.languageCode });
  const chunks: Buffer[] = [];
  for await (const chunk of audio as unknown as AsyncIterable<Uint8Array>) chunks.push(Buffer.from(chunk));
  mkdirSync(dirname(opts.out), { recursive: true });
  writeFileSync(opts.out, Buffer.concat(chunks));
  return opts.out;
}
