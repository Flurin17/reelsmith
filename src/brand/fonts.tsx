/**
 * Load the brand's display + body fonts before the first frame renders.
 *
 * Google fonts are resolved through the Google Fonts CSS2 API at render time,
 * so any family works without importing a per-font module. Local fonts are
 * loaded from public/ via staticFile(). Rendering is blocked with delayRender()
 * until every face is ready, which keeps output deterministic (no FOUT).
 */
import React, { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import type { ResolvedBrand } from './types';

type Spec = ResolvedBrand['fonts']['display'];

/** Subsets we keep from Google's CSS; covers Western European languages. */
const SUBSETS = new Set(['latin', 'latin-ext']);

/** CSS font-family stack for a spec. */
export const cssFamily = (spec: Spec): string => `"${spec.family}", system-ui, sans-serif`;

function mergeSpecs(specs: Spec[]): Spec[] {
  const byKey = new Map<string, Spec>();
  for (const spec of specs) {
    const key = `${spec.source}:${spec.family}:${spec.src ?? ''}`;
    const existing = byKey.get(key);
    byKey.set(key, existing ? { ...existing, weights: [...new Set([...existing.weights, ...spec.weights])] } : spec);
  }
  return [...byKey.values()];
}

async function loadGoogle(spec: Spec): Promise<void> {
  const weights = [...spec.weights].sort((a, b) => Number(a) - Number(b)).join(';');
  const family = encodeURIComponent(spec.family).replace(/%20/g, '+');
  const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=block`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Fonts has no "${spec.family}" with weights ${weights}`);
  const css = await res.text();

  // Each block is preceded by a "/* subset */" comment.
  const blocks = css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*{([^}]*)}/g);
  const loads: Promise<FontFace>[] = [];
  for (const [, subset, body] of blocks) {
    if (!SUBSETS.has(subset)) continue;
    const src = body.match(/src:\s*([^;]+);/)?.[1];
    const weight = body.match(/font-weight:\s*([^;]+);/)?.[1]?.trim() ?? '400';
    const style = body.match(/font-style:\s*([^;]+);/)?.[1]?.trim() ?? 'normal';
    const unicodeRange = body.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();
    if (!src) continue;
    const face = new FontFace(spec.family, src, { weight, style, unicodeRange });
    document.fonts.add(face);
    loads.push(face.load());
  }
  if (loads.length === 0) throw new Error(`No usable font faces returned for "${spec.family}"`);
  await Promise.all(loads);
}

async function loadLocal(spec: Spec): Promise<void> {
  if (!spec.src) throw new Error(`Local font "${spec.family}" needs a "src" inside public/`);
  const face = new FontFace(spec.family, `url(${staticFile(spec.src)})`, {
    weight: spec.weights.length === 1 ? spec.weights[0] : `${spec.weights[0]} ${spec.weights.at(-1)}`,
  });
  document.fonts.add(face);
  await face.load();
}

let loading: Promise<void> | null = null;

/** Start (once per page) and return the font loading promise. */
export function ensureBrandFonts(brand: ResolvedBrand): Promise<void> {
  loading ??= Promise.all(
    mergeSpecs([brand.fonts.display, brand.fonts.body]).map((spec) =>
      spec.source === 'local' ? loadLocal(spec) : loadGoogle(spec),
    ),
  ).then(() => undefined);
  return loading;
}

/**
 * Blocks rendering until the brand fonts are ready. Must wrap every
 * composition: a module-level delayRender() does NOT reliably hold the
 * screenshot, and headless Chrome paints no text for a face that is still
 * loading — frames then come out with missing text.
 */
export const FontGate: React.FC<{ brand: ResolvedBrand; children: React.ReactNode }> = ({ brand, children }) => {
  const [handle] = useState(() => delayRender('Loading brand fonts', { timeoutInMilliseconds: 60_000 }));
  useEffect(() => {
    ensureBrandFonts(brand)
      .then(() => continueRender(handle))
      .catch((err) => cancelRender(err));
  }, [brand, handle]);
  return <>{children}</>;
};
