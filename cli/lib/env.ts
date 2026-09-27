/**
 * Project paths and environment. Secrets (ELEVENLABS_API_KEY, DB URLs for
 * custom catalogs) live in .env.local, which is git-ignored. Never print them.
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotEnv } from 'dotenv';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const PUBLIC = join(ROOT, 'public');
export const OUT = join(ROOT, 'out');
export const JOBS = join(ROOT, 'jobs');

loadDotEnv({ path: join(ROOT, '.env.local'), quiet: true });
loadDotEnv({ path: join(ROOT, '.env'), quiet: true });

/** Read a required secret, failing with a helpful (value-free) message. */
export function requireEnv(name: string, hint: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. ${hint}`);
  return value;
}

/** Path relative to the project root, for friendly log lines. */
export const rel = (abs: string) => abs.replace(`${ROOT}/`, '');
