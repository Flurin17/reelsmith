/**
 * Remotion bundling + rendering. Bundle once per CLI run and reuse the serve
 * URL for every still/video. Remotion ships its own Chrome + ffmpeg.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import sharp from 'sharp';
import { AUDIT_PREFIX, type AuditFrame } from '../../src/core/audit';
import { ROOT } from './env';
import { getTemplate, parsedProps, type LoadedJob } from './jobs';

let serveUrl: Promise<string> | null = null;

export function bundleOnce(): Promise<string> {
  serveUrl ??= bundle({ entryPoint: join(ROOT, 'src/index.ts'), onProgress: () => undefined });
  return serveUrl;
}

/**
 * Resolve the composition (runs calculateMetadata → final props + length).
 * Props are schema-parsed first: Remotion only merges top-level defaults, so
 * nested defaults (e.g. a scene's `visual`) must be applied here.
 */
export async function compositionFor(job: LoadedJob) {
  const url = await bundleOnce();
  const composition = await selectComposition({ serveUrl: url, id: job.template, inputProps: parsedProps(job) });
  return { url, composition };
}

/** Evenly spaced fallback frames. */
function spread(total: number, n = 6): number[] {
  return Array.from({ length: n }, (_, i) => Math.round(((i + 0.5) / n) * (total - 1)));
}

export interface StillsResult {
  files: string[];
  sheet: string;
  frames: number[];
  fps: number;
  durationInFrames: number;
  /** Final props after calculateMetadata (durations filled in, …). */
  props: Record<string, unknown>;
  /** Per-frame DOM audit (only with `audit: true`). */
  audits: AuditFrame[];
}

export async function renderStills(
  job: LoadedJob,
  opts: { frames?: number[]; extraFrames?: number[]; outDir: string; audit?: boolean; sheet?: boolean },
): Promise<StillsResult> {
  const { url, composition } = await compositionFor(job);
  const template = getTemplate(job.template);
  const total = composition.durationInFrames;
  const frames = [
    ...(opts.frames ?? template.stills?.(composition.props as any, total) ?? spread(total)),
    ...(opts.extraFrames ?? []),
  ]
    .map((f) => Math.max(0, Math.min(total - 1, Math.round(f))))
    .filter((f, i, all) => all.indexOf(f) === i)
    .sort((a, b) => a - b);

  mkdirSync(opts.outDir, { recursive: true });
  const files: string[] = [];
  const audits: AuditFrame[] = [];
  const inputProps = opts.audit ? { ...composition.props, __audit: true } : composition.props;
  for (const frame of frames) {
    const output = join(opts.outDir, `frame-${String(frame).padStart(5, '0')}.png`);
    await renderStill({
      serveUrl: url,
      composition: { ...composition, props: inputProps },
      frame,
      output,
      inputProps,
      logLevel: 'error',
      onBrowserLog: (log) => {
        if (log.text.startsWith(AUDIT_PREFIX)) audits.push(JSON.parse(log.text.slice(AUDIT_PREFIX.length)));
      },
    });
    files.push(output);
  }
  const sheet = join(opts.outDir, 'sheet.png');
  if (opts.sheet !== false) await contactSheet(files, sheet, frames, composition.fps);
  return {
    files,
    sheet,
    frames,
    fps: composition.fps,
    durationInFrames: total,
    props: composition.props as Record<string, unknown>,
    audits,
  };
}

/** One image with all stills side by side (+ timestamps) for quick review. */
export async function contactSheet(files: string[], out: string, frames: number[], fps: number): Promise<void> {
  // Small tiles on purpose: agents read this image, and pixels cost tokens.
  const w = 288;
  const h = 512;
  const gap = 12;
  const label = 44;
  const perRow = Math.min(files.length, 5);
  const rows = Math.ceil(files.length / perRow);
  const tiles = await Promise.all(
    files.map(async (file, i) => {
      const img = await sharp(file).resize(w, h).toBuffer();
      const text = Buffer.from(
        `<svg width="${w}" height="${label}"><rect width="100%" height="100%" fill="#111"/><text x="12" y="30" font-family="Helvetica, Arial" font-size="20" fill="#fff">#${i + 1} · frame ${frames[i]} · ${(frames[i] / fps).toFixed(2)}s</text></svg>`,
      );
      return { img, text, i };
    }),
  );
  await sharp({
    create: {
      width: perRow * w + (perRow + 1) * gap,
      height: rows * (h + label) + (rows + 1) * gap,
      channels: 3,
      background: '#2b2b2b',
    },
  })
    .composite(
      tiles.flatMap(({ img, text, i }) => {
        const left = gap + (i % perRow) * (w + gap);
        const top = gap + Math.floor(i / perRow) * (h + label + gap);
        return [
          { input: text, left, top },
          { input: img, left, top: top + label },
        ];
      }),
    )
    .png()
    .toFile(out);
}

export async function renderVideo(job: LoadedJob, opts: { output: string; draft?: boolean }): Promise<void> {
  const { url, composition } = await compositionFor(job);
  let last = -1;
  await renderMedia({
    serveUrl: url,
    composition,
    codec: 'h264',
    inputProps: composition.props,
    outputLocation: opts.output,
    scale: opts.draft ? 0.5 : 1,
    crf: opts.draft ? 30 : 18,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) {
        last = pct;
        process.stdout.write(`  ${pct}%${pct === 100 ? '\n' : ''}`);
      }
    },
  });
}
