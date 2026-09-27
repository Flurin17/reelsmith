/**
 * Royalty-free sound effects, synthesised from scratch (no samples) so they
 * are safe to commit and redistribute. Deterministic: same code, same bytes.
 *
 *   boom   — intro impact          whoosh — slide / zoom transition
 *   pop    — UI element / click    ding   — reward (price reveal)
 *   riser  — build-up into a CTA   hit    — opening accent
 *   swipe  — scene change          tick   — keystroke / small accent
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SR = 44100;

/** Deterministic PRNG (mulberry32) so the generated SFX are reproducible. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normalize to a target peak, soft-clip, and fade the edges to kill clicks. */
function finish(buf: Float32Array, peak = 0.9): Float32Array {
  let max = 1e-9;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  const gain = peak / max;
  for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * gain);
  const fade = Math.floor(0.006 * SR);
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    buf[i] *= g;
    buf[buf.length - 1 - i] *= g;
  }
  return buf;
}

/** Encode mono float samples as a 16-bit PCM WAV buffer. */
export function encodeWav(samples: Float32Array): Buffer {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

const seconds = (s: number) => new Float32Array(Math.floor(s * SR));

/** Low impact thump with a transient click — the intro title landing. */
function boom(): Float32Array {
  const out = seconds(0.5);
  const r = rng(7);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const x = t / 0.5;
    const f = 120 * Math.exp(-5 * x) + 45;
    phase += (2 * Math.PI * f) / SR;
    const env = Math.exp(-6 * x);
    const click = t < 0.012 ? (r() * 2 - 1) * Math.exp(-260 * t) : 0;
    out[i] = Math.sin(phase) * env + click * 0.6;
  }
  return finish(out, 0.95);
}

/** Filtered-noise sweep — a card whooshing across the frame. */
function whoosh(): Float32Array {
  const out = seconds(0.5);
  const r = rng(1234);
  let lp = 0;
  let lp2 = 0;
  for (let i = 0; i < out.length; i++) {
    const x = i / out.length;
    const a = 0.02 + 0.5 * Math.sin(Math.PI * x); // cutoff swells then closes
    const nz = r() * 2 - 1;
    lp += a * (nz - lp);
    lp2 += a * (lp - lp2);
    const env = Math.pow(Math.sin(Math.PI * x), 1.5);
    out[i] = lp2 * env * 2.2;
  }
  return finish(out, 0.85);
}

/** Short pitched blip — a small UI element popping in. */
function pop(): Float32Array {
  const out = seconds(0.14);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const x = i / out.length;
    const f = 820 * Math.exp(-6 * x) + 180;
    phase += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(phase) * Math.exp(-22 * x);
  }
  return finish(out, 0.85);
}

/** Bright inharmonic bell — the price reward. */
function ding(): Float32Array {
  const out = seconds(0.7);
  const base = 1180;
  const parts: Array<[number, number]> = [
    [1, 1],
    [2.01, 0.6],
    [2.76, 0.4],
    [3.93, 0.25],
  ];
  const decay = [5, 7, 9, 12];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = 0;
    parts.forEach((p, k) => {
      s += p[1] * Math.sin(2 * Math.PI * base * p[0] * t) * Math.exp(-decay[k] * t);
    });
    out[i] = s * Math.min(1, t / 0.004);
  }
  return finish(out, 0.8);
}

/** Rising tone + shimmer that crests then drops — build-up into the CTA. */
function riser(): Float32Array {
  const out = seconds(1.0);
  const r = rng(99);
  let phase = 0;
  let lp = 0;
  for (let i = 0; i < out.length; i++) {
    const x = i / out.length;
    const f = 170 * Math.pow(1300 / 170, x);
    phase += (2 * Math.PI * f) / SR;
    const a = 0.05 + 0.4 * x;
    lp += a * (r() * 2 - 1 - lp);
    const e = x < 0.9 ? Math.pow(x / 0.9, 1.4) : Math.max(0, 1 - (x - 0.9) / 0.1);
    out[i] = (Math.sin(phase) * 0.8 + lp * 0.5 * x) * e;
  }
  return finish(out, 0.85);
}

/** Snappy impact for the opening hook. */
function infoHit(): Float32Array {
  const out = seconds(0.22);
  const r = rng(2026);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const x = i / out.length;
    const f = 190 * Math.exp(-8 * x) + 62;
    phase += (2 * Math.PI * f) / SR;
    const click = t < 0.018 ? (r() * 2 - 1) * Math.exp(-210 * t) : 0;
    out[i] = Math.sin(phase) * Math.exp(-12 * x) + click * 0.8;
  }
  return finish(out, 0.9);
}

/** Short filtered swipe for text/card changes. */
function infoSwipe(): Float32Array {
  const out = seconds(0.32);
  const r = rng(44);
  let lp = 0;
  for (let i = 0; i < out.length; i++) {
    const x = i / out.length;
    const a = 0.04 + 0.36 * (1 - x);
    lp += a * (r() * 2 - 1 - lp);
    const env = Math.sin(Math.PI * x);
    out[i] = lp * env * 1.6;
  }
  return finish(out, 0.78);
}

/** Crisp notification tick for mid-scene emphasis. */
function infoTick(): Float32Array {
  const out = seconds(0.09);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const x = i / out.length;
    const f = 1500 + 700 * x;
    phase += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(phase) * Math.exp(-20 * x);
  }
  return finish(out, 0.68);
}

/** Every generated sound, keyed by the file name used in `sfx` props. */
export const SOUNDS: Record<string, () => Float32Array> = {
  'boom.wav': boom,
  'whoosh.wav': whoosh,
  'pop.wav': pop,
  'ding.wav': ding,
  'riser.wav': riser,
  'hit.wav': infoHit,
  'swipe.wav': infoSwipe,
  'tick.wav': infoTick,
};

/** Write the full royalty-free SFX set into `dir`; returns the file names. */
export function generateSfx(dir: string): string[] {
  mkdirSync(dir, { recursive: true });
  return Object.entries(SOUNDS).map(([name, make]) => {
    writeFileSync(join(dir, name), encodeWav(make()));
    return name;
  });
}
