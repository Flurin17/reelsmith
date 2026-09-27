/**
 * Config contract for `reelsmith.config.ts`.
 *
 * The config is imported by BOTH the browser bundle (Remotion renders the brand)
 * and the Node CLI (catalog, voiceover). Keep it plain data — no `fs`, no DB
 * clients. Node-only behaviour (custom catalogs) is referenced by file path and
 * loaded lazily by the CLI.
 */
import type { Brand } from './brand/types';

export type CatalogConfig =
  /** A JSON array of products (see `Product` in cli/catalog.ts). */
  | { type: 'json'; path: string }
  /** A CSV file with a header row (id,name,price,category,description,image,available). */
  | { type: 'csv'; path: string }
  /**
   * A TS/JS module whose default export is `() => Promise<Product[]>`.
   * Use this to pull from a database, Shopify, an API, … (Node-only code is fine there).
   */
  | { type: 'module'; path: string };

export interface VoiceConfig {
  provider: 'elevenlabs';
  /** ElevenLabs model id. `eleven_v3` supports inline audio tags like [excited]. */
  model: string;
  /** ISO 639-1 language code sent to the TTS provider (e.g. 'en', 'de'). */
  languageCode?: string;
  /**
   * Named voices. `narrator` is used for single-voice scenes; dialogue turns
   * reference voices by key (e.g. speaker "a" → voices.a).
   */
  voices: Record<string, string>;
  /** Provider voice settings passed through as-is. */
  settings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    speed?: number;
    useSpeakerBoost?: boolean;
  };
  /** Seconds of air kept after the last spoken word when timing scenes. */
  tailPadding?: number;
}

export interface ReelsmithConfig {
  brand: Brand;
  catalog?: CatalogConfig;
  voice?: VoiceConfig;
  /**
   * Images are copied into public/products. With `cutout: true`, flat white
   * studio backgrounds are removed so products float over the scene.
   */
  images?: { cutout?: boolean };
}

/** Identity helper that gives `reelsmith.config.ts` full type-checking. */
export function defineConfig(config: ReelsmithConfig): ReelsmithConfig {
  return config;
}
