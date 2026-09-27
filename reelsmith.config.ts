/**
 * Node-side settings: fallback catalog + voice. Brands live in brands/<id>/.
 */
import { defineConfig } from './src/config';

export default defineConfig({
  voice: {
    provider: 'elevenlabs',
    model: 'eleven_v3',
    languageCode: 'en',
    voices: {
      // Replace with voices from `pnpm reelsmith voices --language en`.
      narrator: 'JBFqnCBsd6RMkjVDRZzb',
      a: 'EXAVITQu4vr4xnSDxMaL',
      b: 'JBFqnCBsd6RMkjVDRZzb',
    },
    settings: { stability: 0.4, similarityBoost: 0.78, style: 0.5, speed: 1.05, useSpeakerBoost: true },
    tailPadding: 0.3,
  },
  images: { cutout: false },
});
