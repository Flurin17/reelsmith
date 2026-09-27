/**
 * Text-to-speech providers. A provider returns audio plus word timings so the
 * pipeline can size scenes and render synced captions in one step.
 *
 * Only ElevenLabs ships today; add another provider by implementing
 * `TtsProvider` and wiring it up in `createProvider`.
 */
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { VoiceConfig } from '../../src/config';
import { alignmentToWords, type CaptionWord, type CharacterAlignment } from '../../src/core/captions';
import { requireEnv } from './env';

export interface SpeechResult {
  audio: Buffer;
  /** Empty when the provider returned no alignment. */
  captions: CaptionWord[];
}

export interface DialogueLine {
  speaker: string;
  voiceId: string;
  text: string;
}

export interface TtsProvider {
  speak(text: string, voiceId: string): Promise<SpeechResult>;
  dialogue(lines: DialogueLine[]): Promise<SpeechResult>;
}

class ElevenLabsProvider implements TtsProvider {
  private client: ElevenLabsClient;

  constructor(private voice: VoiceConfig) {
    this.client = new ElevenLabsClient({
      apiKey: requireEnv('ELEVENLABS_API_KEY', 'Add it to .env.local (see .env.example).'),
    });
  }

  async speak(text: string, voiceId: string): Promise<SpeechResult> {
    const res = await this.client.textToSpeech.convertWithTimestamps(voiceId, {
      text,
      modelId: this.voice.model,
      languageCode: this.voice.languageCode,
      outputFormat: 'mp3_44100_128',
      applyTextNormalization: 'auto',
      voiceSettings: this.voice.settings,
    });
    return {
      audio: Buffer.from(res.audioBase64, 'base64'),
      captions: res.alignment ? alignmentToWords(res.alignment as CharacterAlignment) : [],
    };
  }

  async dialogue(lines: DialogueLine[]): Promise<SpeechResult> {
    const res = await this.client.textToDialogue.convertWithTimestamps({
      inputs: lines.map((l) => ({ text: l.text, voiceId: l.voiceId })),
      modelId: this.voice.model,
      languageCode: this.voice.languageCode,
      outputFormat: 'mp3_44100_128',
      applyTextNormalization: 'auto',
      settings: this.voice.settings?.stability != null ? { stability: this.voice.settings.stability } : undefined,
    });
    // Map each character back to the dialogue line (→ speaker) it belongs to.
    const segments = res.voiceSegments ?? [];
    const speakerAt = (i: number) => {
      const seg = segments.find((s) => i >= s.characterStartIndex && i < s.characterEndIndex);
      return seg ? (lines[seg.dialogueInputIndex]?.speaker ?? '') : '';
    };
    return {
      audio: Buffer.from(res.audioBase64, 'base64'),
      captions: res.alignment ? alignmentToWords(res.alignment as CharacterAlignment, speakerAt) : [],
    };
  }
}

export function createProvider(voice: VoiceConfig): TtsProvider {
  switch (voice.provider) {
    case 'elevenlabs':
      return new ElevenLabsProvider(voice);
    default:
      throw new Error(`Unsupported TTS provider: ${String(voice.provider)}`);
  }
}
