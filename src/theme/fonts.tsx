/**
 * Load a theme's fonts before the first frame renders.
 *
 * Google fonts are resolved through the Google Fonts CSS2 API at render time,
 * so any family works without a per-font import. Local fonts load from public/.
 * `FontGate` blocks rendering with a component-scoped delayRender() until every
 * face is ready — a module-level delayRender() does NOT reliably hold the
 * screenshot, and headless Chrome paints no text while a webfont is loading.
 */
import React, { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import type { ResolvedTheme } from './resolve';
import type { FontSpec } from './types';

/** Subsets kept from Google's CSS; covers Western and Central European text. */
const SUBSETS = new Set(['latin', 'latin-ext']);

function googleUrl(spec: FontSpec): string {
  const weights = [...new Set(spec.weights ?? ['400'])].sort((a, b) => Number(a) - Number(b));
  const family = encodeURIComponent(spec.family).replace(/%20/g, '+');
  const axis = spec.italic
    ? `ital,wght@${[...weights.map((w) => `0,${w}`), ...weights.map((w) => `1,${w}`)].join(';')}`
    : `wght@${weights.join(';')}`;
  return `https://fonts.googleapis.com/css2?family=${family}:${axis}&display=block`;
}

async function loadGoogle(spec: FontSpec): Promise<void> {
  const res = await fetch(googleUrl(spec));
  if (!res.ok) throw new Error(`Google Fonts has no "${spec.family}" with weights ${spec.weights?.join(',')}`);
  const css = await res.text();
  const loads: Promise<FontFace>[] = [];
  for (const [, subset, body] of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*{([^}]*)}/g)) {
    if (!SUBSETS.has(subset)) continue;
    const src = body.match(/src:\s*([^;]+);/)?.[1];
    if (!src) continue;
    const face = new FontFace(spec.family, src, {
      weight: body.match(/font-weight:\s*([^;]+);/)?.[1]?.trim() ?? '400',
      style: body.match(/font-style:\s*([^;]+);/)?.[1]?.trim() ?? 'normal',
      unicodeRange: body.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim(),
    });
    document.fonts.add(face);
    loads.push(face.load());
  }
  if (loads.length === 0) throw new Error(`No usable font faces returned for "${spec.family}"`);
  await Promise.all(loads);
}

async function loadLocal(spec: FontSpec): Promise<void> {
  if (!spec.src) throw new Error(`Local font "${spec.family}" needs "src" (a path inside public/)`);
  const weights = spec.weights ?? ['400'];
  const face = new FontFace(spec.family, `url(${staticFile(spec.src)})`, {
    weight: weights.length === 1 ? weights[0] : `${weights[0]} ${weights.at(-1)}`,
  });
  document.fonts.add(face);
  await face.load();
}

const loading = new Map<string, Promise<void>>();

/** Start (once per font per page) and await loading a theme's fonts. */
export function ensureThemeFonts(theme: ResolvedTheme): Promise<void> {
  const specs = [theme.fonts.display, theme.fonts.body, theme.fonts.mono].filter(Boolean) as FontSpec[];
  return Promise.all(
    specs.map((spec) => {
      const key = JSON.stringify(spec);
      let p = loading.get(key);
      if (!p) {
        p = spec.source === 'local' ? loadLocal(spec) : loadGoogle(spec);
        loading.set(key, p);
      }
      return p;
    }),
  ).then(() => undefined);
}

/**
 * Children mount only after the fonts are loaded: components measure text
 * (fitSize) during render, and a measurement against a fallback font would
 * never be redone for a still frame.
 */
export const FontGate: React.FC<{ theme: ResolvedTheme; children: React.ReactNode }> = ({ theme, children }) => {
  const [handle] = useState(() => delayRender(`Loading fonts for ${theme.id}`, { timeoutInMilliseconds: 60_000 }));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    ensureThemeFonts(theme)
      .then(() => setReady(true))
      .catch((err) => cancelRender(err));
  }, [theme]);
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);
  return ready ? <>{children}</> : null;
};
