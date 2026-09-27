/**
 * Your brand + data + voice settings. This is the only file you need to edit
 * to make every template yours. Keep it plain data: it is bundled into the
 * browser renderer as well as read by the CLI.
 */
import { defineConfig } from './src/config';

export default defineConfig({
  brand: {
    name: 'Lumen Supply',
    url: 'lumen-supply.example',
    handle: '@lumensupply',
    // A file in public/ (SVG recommended). Leave empty for a text wordmark.
    logo: '',
    locale: 'en-US',
    currency: 'USD',
    colors: {
      paper: '#f6f4ef',
      surface: '#fffdf9',
      muted: '#efebe3',
      border: '#d9d3c7',
      ink: '#161616',
      inkMuted: '#55524c',
      primary: '#c2410c',
      onPrimary: '#ffffff',
      secondary: '#ffc933',
      onSecondary: '#161616',
      night: '#0b0a0f',
      onNight: '#ffffff',
      accent: '#cf4a0c',
      onAccent: '#ffffff',
      highlight: '#ffd27a',
    },
    fonts: {
      display: { family: 'Anton', weights: ['400'] },
      body: { family: 'Montserrat', weights: ['600', '700', '800', '900'] },
    },
  },

  // Where product-driven templates (spotlight, carousel, budget guide) get data.
  // Swap for { type: 'csv', path } or { type: 'module', path: 'data/catalog.ts' }.
  catalog: { type: 'json', path: 'examples/catalog.json' },

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
