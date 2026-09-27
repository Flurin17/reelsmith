/**
 * `reelsmith review` — automated grading for a job.
 *
 * Combines three kinds of checks into one scored report:
 *  1. Frame audit (measured in the real render): clipped/off-canvas text,
 *     text under platform UI, overlaps, tiny text, low contrast, broken images.
 *  2. Job checks (props + files): missing assets, voiceover state, speech cut
 *     off by short scenes, reading speed, total length, hook in the first second.
 *  3. Template lint (source): hardcoded colors / fonts instead of useTheme().
 *
 * Output (out/review/<slug>/): report.md, report.json, frames/, annotated/,
 * sheet.png (issues boxed in place), history.json.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { PLATFORM_UI, contrastRatio, type AuditFrame, type AuditIssue } from '../../src/core/audit';
import { stripAudioTags, type CaptionWord } from '../../src/core/captions';
import { placeScenes } from '../../src/core/scenes';
import { PUBLIC, ROOT, rel } from './env';
import type { LoadedJob } from './jobs';
import { contactSheet, renderStills } from './render';

export type Severity = 'error' | 'warn' | 'info';

export interface Finding {
  rule: string;
  severity: Severity;
  message: string;
  fix: string;
  frame?: number;
  scene?: string;
  box?: AuditIssue['box'];
}

export interface ReviewResult {
  slug: string;
  template: string;
  score: number;
  passed: boolean;
  counts: Record<Severity, number>;
  durationSeconds: number;
  findings: Finding[];
  frames: { frame: number; time: number; scene?: string; file: string; annotated?: string; issues: number }[];
  sheet: string;
  report: string;
}

const FIX: Record<string, string> = {
  'text-off-canvas': 'Size text with fitSize(), shorten the copy, or move it inside SAFE.',
  'text-clipped': 'Let the container grow or size the text to it with fitSize(); shorten the copy.',
  'platform-ui-overlap': 'Move text inside the safe area (SAFE in src/core/template.ts); platform UI covers this zone.',
  'text-overlap': 'Give the elements their own space (gap/padding/position) or reduce their size.',
  'text-too-small': 'Use at least 28px (ideally 34px+) so text reads on a phone at arm’s length.',
  'low-contrast':
    'Use token pairs that pass `pnpm reelsmith brand <id>` (tone.text on tone.bg, onAccent on accent, colors.text on colors.surface).',
  'image-missing': 'Check the file exists under public/ and the prop path is right.',
  'asset-missing': 'Add the file under public/ (or fix the path), or clear the prop to use the fallback.',
  'voiceover-missing': 'Run `pnpm reelsmith voiceover <job>` to synthesise narration, captions and durations.',
  'speech-cut-off': 'Re-run `pnpm reelsmith voiceover <job>` or increase the scene `duration`.',
  'no-captions': 'Re-run `pnpm reelsmith voiceover <job> --force` to get word timings (most viewers watch muted).',
  'reading-speed': 'Cut on-screen words or lengthen the scene; aim for ≤ 3 words per second.',
  'scene-too-short': 'Give every scene at least ~1.2s so it registers.',
  duration: 'Aim for 9–15s (product) or 20–35s (explainer); keep under 60s.',
  'no-hook-text': 'Put a hook headline on screen within the first second.',
  'blank-frame': 'This frame is (nearly) empty — check timing, fades and missing assets.',
  'text-not-painted':
    'The text is in the DOM but no glyphs show up in the pixels: same color as its background, faded out, or a custom font that is not awaited with delayRender() (headless Chrome paints no text while a webfont is loading). Use the brand fonts via useTheme().',
  'hardcoded-style':
    'Use useTheme() tokens (colors, tone(i), type(), shadow(), alpha()) instead of literals so the template follows every brand.',
};

const PENALTY: Record<Severity, number> = { error: 15, warn: 5, info: 0 };

// ---------------------------------------------------------------- job checks

type Scene = {
  id: string;
  from: number;
  duration: number;
  voiceover?: string;
  say?: string;
  dialogue?: unknown[];
  captions?: CaptionWord[];
  [k: string]: unknown;
};

/** Visible words a viewer has to read in a scene (headline, body, bullets…). */
function onScreenWords(scene: Record<string, unknown>): number {
  const ignore = new Set([
    'id',
    'voiceover',
    'say',
    'tone',
    'cta',
    'dialogue',
    'captions',
    'image',
    'type',
    'from',
    'duration',
  ]);
  let words = 0;
  const walk = (v: unknown, key = '') => {
    if (ignore.has(key)) return;
    if (typeof v === 'string') words += v.split(/\s+/).filter(Boolean).length;
    else if (Array.isArray(v)) v.forEach((x) => walk(x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(scene);
  return words;
}

/** Files referenced by props that don't exist under public/. */
export function assetChecks(props: Record<string, unknown>): Finding[] {
  const findings: Finding[] = [];
  const check = (folder: string, file: unknown, where: string) => {
    if (typeof file !== 'string' || !file) return;
    if (!existsSync(join(PUBLIC, folder, file))) {
      findings.push({
        rule: 'asset-missing',
        severity: 'error',
        message: `${where}: public/${folder ? `${folder}/` : ''}${file} does not exist`,
        fix: FIX['asset-missing'],
      });
    }
  };
  const walk = (v: unknown, path: string) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        const p = path ? `${path}.${k}` : k;
        if (k === 'image') {
          if (typeof x === 'string' && x && !/^https?:\/\//.test(x)) check('', x, p);
        } else if (k === 'voiceover') check('voiceovers', x, p);
        else if (path === 'music' && k === 'file') check('music', x, p);
        else if (path === 'sfx' && typeof x === 'string') check('sfx', x, p);
        else if (path === 'backgrounds' && typeof x === 'string') check('bg', x, p);
        else walk(x, p);
      }
    }
  };
  walk(props, '');
  return findings;
}

function sceneChecks(props: Record<string, unknown>, fps: number): { findings: Finding[]; scenes: Scene[] } {
  const raw = props.scenes;
  if (!Array.isArray(raw)) return { findings: [], scenes: [] };
  const scenes = placeScenes(raw as (Scene & { say: string; voiceover: string })[], fps) as Scene[];
  const findings: Finding[] = [];
  const showsCaptions = props.showCaptions !== false;

  for (const s of scenes) {
    const seconds = s.duration / fps;
    const speaks = Boolean(String(s.say ?? '').trim()) || (Array.isArray(s.dialogue) && s.dialogue.length > 0);
    if (speaks && !s.voiceover) {
      // Without a TTS key the agent can't fix this itself — report, don't penalise.
      const canFix = Boolean(process.env.ELEVENLABS_API_KEY);
      findings.push({
        rule: 'voiceover-missing',
        severity: canFix ? 'warn' : 'info',
        scene: s.id,
        frame: s.from,
        message: `Scene "${s.id}" has narration text but no audio yet${canFix ? '' : ' (ELEVENLABS_API_KEY not set)'}`,
        fix: FIX['voiceover-missing'],
      });
    }
    const captions = s.captions ?? [];
    if (s.voiceover && captions.length && captions.at(-1)!.end > seconds + 0.05) {
      findings.push({
        rule: 'speech-cut-off',
        severity: 'error',
        scene: s.id,
        frame: s.from,
        message: `Scene "${s.id}" ends at ${seconds.toFixed(2)}s but speech runs to ${captions.at(-1)!.end.toFixed(2)}s`,
        fix: FIX['speech-cut-off'],
      });
    }
    if (s.voiceover && !captions.length && showsCaptions && speaks) {
      findings.push({
        rule: 'no-captions',
        severity: 'info',
        scene: s.id,
        message: `Scene "${s.id}" has audio but no word timings`,
        fix: FIX['no-captions'],
      });
    }
    if (seconds < 1.2) {
      findings.push({
        rule: 'scene-too-short',
        severity: 'warn',
        scene: s.id,
        frame: s.from,
        message: `Scene "${s.id}" is only ${seconds.toFixed(2)}s`,
        fix: FIX['scene-too-short'],
      });
    }
    const words = onScreenWords(s);
    if (words / seconds > 3.3 && words > 6) {
      findings.push({
        rule: 'reading-speed',
        severity: 'warn',
        scene: s.id,
        frame: s.from,
        message: `Scene "${s.id}" shows ${words} words in ${seconds.toFixed(1)}s (${(words / seconds).toFixed(1)}/s)`,
        fix: FIX['reading-speed'],
      });
    }
  }
  return { findings, scenes };
}

// ------------------------------------------------------------ template lint

function listSources(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? listSources(p) : /\.(tsx?|jsx?)$/.test(name) ? [p] : [];
  });
}

/** Flag literal colors/fonts in a template's source (they bypass the brand). */
export function lintTemplateSource(source: string): { line: number; match: string }[] {
  const hits: { line: number; match: string }[] = [];
  const lines = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).split('\n');
  lines.forEach((raw, i) => {
    const line = raw.replace(/\/\/.*$/, '');
    // A color literal: a string that IS a hex color, or CSS using one ("0 0 0 #abc", "linear-gradient(#abc…").
    // Pure black/white are neutral and allowed (like rgba(0,0,0,…)).
    const hex = [...line.matchAll(/['"`]([^'"`]*)['"`]/g)]
      .map((m) => m[1])
      .find((str) => {
        const colors = [...str.matchAll(/(^|[\s(,])#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g)].map((m) =>
          m[2].toLowerCase(),
        );
        const css = /^\s*#[0-9a-f]{3,8}\s*$/i.test(str) || /gradient\(|solid|px|rgba?\(/.test(str);
        return css && colors.some((c) => !/^(f{3}|f{6}|0{3}|0{6}|f{8}|0{8})$/.test(c));
      });
    const rgb = [...line.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)].find(
      (m) => !(m[1] === m[2] && m[2] === m[3] && (m[1] === '0' || m[1] === '255')),
    );
    const font = line.match(/fontFamily:\s*['"`][^'"`]+['"`]/);
    const found = hex ?? rgb?.[0] ?? font?.[0];
    if (found) hits.push({ line: i + 1, match: found.trim() });
  });
  return hits;
}

function lintTemplate(templateId: string): Finding[] {
  return listSources(join(ROOT, 'src/templates', templateId)).flatMap((file) =>
    lintTemplateSource(readFileSync(file, 'utf8')).map((hit) => ({
      rule: 'hardcoded-style',
      severity: 'warn' as const,
      message: `${rel(file)}:${hit.line} uses a literal style \`${hit.match}\``,
      fix: FIX['hardcoded-style'],
    })),
  );
}

// ------------------------------------------------------------------ scoring

export function scoreFindings(findings: Finding[]): {
  score: number;
  counts: Record<Severity, number>;
  passed: boolean;
} {
  const counts: Record<Severity, number> = { error: 0, warn: 0, info: 0 };
  const perRule = new Map<string, number>();
  let penalty = 0;
  for (const f of findings) {
    counts[f.severity]++;
    // Cap each rule at 3 hits so one repeated problem doesn't drown the rest.
    const n = (perRule.get(f.rule) ?? 0) + 1;
    perRule.set(f.rule, n);
    if (n <= 3) penalty += PENALTY[f.severity];
  }
  const score = Math.max(0, 100 - penalty);
  return { score, counts, passed: counts.error === 0 && score >= 80 };
}

// --------------------------------------------------------------- annotation

async function annotate(file: string, out: string, issues: AuditIssue[]): Promise<void> {
  const { width = 1080, height = 1920 } = await sharp(file).metadata();
  const zones = PLATFORM_UI.map(
    (z) =>
      `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="rgba(0,120,255,0.10)" stroke="rgba(0,120,255,0.5)" stroke-dasharray="12 8" stroke-width="3"/>`,
  ).join('');
  const boxes = issues
    .map((iss, i) => {
      const color = iss.severity === 'error' ? '#ff1744' : '#ff9100';
      const { x, y, w, h } = iss.box;
      return `<rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" fill="none" stroke="${color}" stroke-width="6"/>
<rect x="${x - 4}" y="${Math.max(0, y - 46)}" width="46" height="42" fill="${color}"/>
<text x="${x + 19}" y="${Math.max(0, y - 46) + 31}" font-family="Helvetica, Arial" font-weight="700" font-size="28" fill="#fff" text-anchor="middle">${i + 1}</text>`;
    })
    .join('');
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${zones}${boxes}</svg>`,
  );
  await sharp(file)
    .composite([{ input: svg }])
    .png()
    .toFile(out);
}

type Raw = { data: Buffer; width: number; height: number; channels: number };

async function loadRaw(file: string): Promise<Raw> {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Pixels of a rectangle (clamped to the image), as [r,g,b] triples. */
function pixels(img: Raw, x0: number, y0: number, x1: number, y1: number): number[][] {
  const out: number[][] = [];
  const xs = Math.max(0, Math.floor(x0));
  const ys = Math.max(0, Math.floor(y0));
  const xe = Math.min(img.width, Math.ceil(x1));
  const ye = Math.min(img.height, Math.ceil(y1));
  for (let y = ys; y < ye; y += 2) {
    for (let x = xs; x < xe; x += 2) {
      const i = (y * img.width + x) * img.channels;
      out.push([img.data[i], img.data[i + 1], img.data[i + 2]]);
    }
  }
  return out;
}

const stdev = (vals: number[]) => {
  const m = vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1);
  return Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(vals.length, 1));
};
const median = (vals: number[]) => [...vals].sort((a, b) => a - b)[Math.floor(vals.length / 2)] ?? 0;

function parseCss(color: string): [number, number, number, number] | null {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1]
    .split(/[ ,/]+/)
    .filter(Boolean)
    .map(Number);
  return [p[0], p[1], p[2], p[3] ?? 1];
}

/**
 * Pixel checks per text box: (1) is anything painted inside it, and (2) the
 * contrast between the text color and the background actually rendered right
 * around it (a thin ring outside the glyph box) — robust to layered tones,
 * gradients and images, which a DOM walk cannot see.
 */
function pixelChecks(img: Raw, audit: AuditFrame | undefined) {
  const unpainted: AuditFrame['texts'] = [];
  const lowContrast: { t: AuditFrame['texts'][number]; ratio: number; needed: number }[] = [];
  for (const t of audit?.texts ?? []) {
    const { x, y, w, h } = t.box;
    if (w < 8 || h < 8) continue;
    const inside = pixels(img, x, y, x + w, y + h);
    if (inside.length && ['r', 'g', 'b'].every((_, c) => stdev(inside.map((p) => p[c])) < 5)) {
      unpainted.push(t);
      continue;
    }
    const m = 4;
    const k = 6;
    const ring = [
      ...pixels(img, x - m - k, y - m - k, x + w + m + k, y - m),
      ...pixels(img, x - m - k, y + h + m, x + w + m + k, y + h + m + k),
      ...pixels(img, x - m - k, y - m, x - m, y + h + m),
      ...pixels(img, x + w + m, y - m, x + w + m + k, y + h + m),
    ];
    const fg = parseCss(t.color);
    if (!fg || t.shadow || ring.length < 20) continue;
    if (stdev(ring.map((p) => luma(p[0], p[1], p[2]))) > 38) continue; // busy background (image/gradient edge)
    const bg: [number, number, number, number] = [
      median(ring.map((p) => p[0])),
      median(ring.map((p) => p[1])),
      median(ring.map((p) => p[2])),
      1,
    ];
    const a = fg[3];
    const blended: [number, number, number, number] = [0, 1, 2]
      .map((c) => fg[c] * a + bg[c] * (1 - a))
      .concat(1) as never;
    const ratio = contrastRatio(blended, bg);
    const needed = t.font >= 48 ? 3 : 4.5;
    if (ratio < needed) lowContrast.push({ t, ratio, needed });
  }
  return { unpainted, lowContrast };
}

async function isBlank(file: string): Promise<boolean> {
  const stats = await sharp(file).stats();
  return stats.channels.slice(0, 3).every((c) => c.stdev < 3);
}

// ------------------------------------------------------------------- report

function sceneAt(scenes: Scene[], frame: number): string | undefined {
  return scenes.find((s) => frame >= s.from && frame < s.from + s.duration)?.id;
}

function markdown(r: ReviewResult, history: { at: string; score: number }[]): string {
  const verdict = r.passed ? '✅ PASS' : '❌ NEEDS WORK';
  const prev = history.length > 1 ? history[history.length - 2].score : null;
  const trend = prev == null ? '' : ` (previous run: ${prev}, ${r.score - prev >= 0 ? '+' : ''}${r.score - prev})`;
  const bySeverity = (sev: Severity) => r.findings.filter((f) => f.severity === sev);
  const section = (title: string, list: Finding[]) =>
    list.length === 0
      ? ''
      : `\n### ${title}\n\n${list
          .map(
            (f, i) =>
              `${i + 1}. **${f.rule}**${f.scene ? ` · scene \`${f.scene}\`` : ''}${f.frame != null ? ` · frame ${f.frame}` : ''} — ${f.message}\n   - Fix: ${f.fix}`,
          )
          .join('\n')}\n`;

  return `# Review: ${r.slug} (${r.template})

**Automated score: ${r.score}/100 — ${verdict}**${trend}
Errors: ${r.counts.error} · Warnings: ${r.counts.warn} · Info: ${r.counts.info} · Length: ${r.durationSeconds.toFixed(1)}s

- Contact sheet (issues boxed: red = error, orange = warning; blue dashes = platform UI): \`${r.sheet}\`
${section('Errors (must fix)', bySeverity('error'))}${section('Warnings', bySeverity('warn'))}${section('Info', bySeverity('info'))}
## Frames

| # | Frame | Time | Scene | Issues | File |
| - | ----- | ---- | ----- | ------ | ---- |
${r.frames.map((f, i) => `| ${i + 1} | ${f.frame} | ${f.time.toFixed(2)}s | ${f.scene ?? ''} | ${f.issues} | \`${f.annotated ?? f.file}\` |`).join('\n')}

## Visual rubric (for the reviewing agent)

The script cannot judge taste. Look at the contact sheet and score each
criterion 1–5. Pass = automated PASS **and** every criterion ≥ 3 **and** average ≥ 4.

| Criterion | What "5" looks like | Score |
| --------- | ------------------- | ----- |
| Hook | Frame 1 makes a clear claim/question in ≤ 6 words; you want to see frame 2 | |
| Clarity | One idea per scene; the main element is obvious in < 1s | |
| Brand fidelity | Colors, type, shapes and tone match brand/guidelines.md | |
| Composition | Clear hierarchy, balanced, no dead zones or crowding, safe areas respected | |
| Variety & pacing | Consecutive frames look different; nothing lingers or rushes | |
| CTA | Last frame tells viewers exactly where to go, softly and on-brand | |
`;
}

// --------------------------------------------------------------------- main

export async function reviewJob(job: LoadedJob, opts: { frames?: number[] } = {}): Promise<ReviewResult> {
  const dir = join(ROOT, 'out', 'review', job.slug);
  rmSync(join(dir, 'frames'), { recursive: true, force: true });
  rmSync(join(dir, 'annotated'), { recursive: true, force: true });

  // 0.8s is always audited: is there a hook on screen in the first second?
  const hookFrame = 24;
  const stills = await renderStills(job, {
    frames: opts.frames,
    extraFrames: [hookFrame],
    outDir: join(dir, 'frames'),
    audit: true,
    sheet: false,
  });
  const { fps, durationInFrames, props } = stills;
  const findings: Finding[] = [];

  const { findings: sceneFindings, scenes } = sceneChecks(props, fps);
  findings.push(...assetChecks(props), ...sceneFindings, ...lintTemplate(job.template));

  const seconds = durationInFrames / fps;
  if (seconds < 6 || seconds > 60) {
    findings.push({
      rule: 'duration',
      severity: 'warn',
      message: `Video is ${seconds.toFixed(1)}s long`,
      fix: FIX.duration,
    });
  } else if (seconds > 35) {
    findings.push({
      rule: 'duration',
      severity: 'info',
      message: `Video is ${seconds.toFixed(1)}s — only go past 35s if the topic needs it`,
      fix: FIX.duration,
    });
  }

  const auditByFrame = new Map(stills.audits.map((a) => [a.frame, a] as const));
  const hook = auditByFrame.get(hookFrame);
  if (hook && hook.textCount === 0) {
    findings.push({
      rule: 'no-hook-text',
      severity: 'warn',
      frame: hookFrame,
      message: 'No readable text on screen at 0.8s',
      fix: FIX['no-hook-text'],
    });
  }

  mkdirSync(join(dir, 'annotated'), { recursive: true });
  const frames: ReviewResult['frames'] = [];
  const annotatedFiles: string[] = [];
  for (let i = 0; i < stills.frames.length; i++) {
    const frame = stills.frames[i];
    const file = stills.files[i];
    const audit: AuditFrame | undefined = auditByFrame.get(frame);
    const issues = audit?.issues ?? [];
    const scene = sceneAt(scenes, frame);
    for (const iss of issues) {
      findings.push({
        rule: iss.rule,
        severity: iss.severity,
        message: iss.message,
        fix: FIX[iss.rule] ?? '',
        frame,
        scene,
        box: iss.box,
      });
    }
    const px = pixelChecks(await loadRaw(file), audit);
    for (const { t, ratio, needed } of px.lowContrast) {
      const message = `"${t.text}" contrast ${ratio.toFixed(1)}:1 against what is behind it (needs ${needed}:1)`;
      issues.push({ rule: 'low-contrast', severity: 'warn', message, box: t.box });
      findings.push({
        rule: 'low-contrast',
        severity: 'warn',
        message,
        fix: FIX['low-contrast'],
        frame,
        scene,
        box: t.box,
      });
    }
    for (const t of px.unpainted) {
      const issue: AuditIssue = {
        rule: 'text-clipped',
        severity: 'error',
        message: `"${t.text}" is not visible in the rendered pixels`,
        box: t.box,
      };
      issues.push(issue);
      findings.push({
        rule: 'text-not-painted',
        severity: 'error',
        message: issue.message,
        fix: FIX['text-not-painted'],
        frame,
        scene,
        box: t.box,
      });
    }
    if (await isBlank(file)) {
      findings.push({
        rule: 'blank-frame',
        severity: 'warn',
        frame,
        scene,
        message: `Frame ${frame} is nearly uniform`,
        fix: FIX['blank-frame'],
      });
    }
    // Only frames with issues get an annotated copy; the sheet uses it in place.
    const annotated = join(dir, 'annotated', `frame-${String(frame).padStart(5, '0')}.png`);
    if (issues.length) await annotate(file, annotated, issues);
    annotatedFiles.push(issues.length ? annotated : file);
    frames.push({
      frame,
      time: frame / fps,
      scene,
      file: rel(file),
      annotated: issues.length ? rel(annotated) : undefined,
      issues: issues.length,
    });
  }

  const sheet = join(dir, 'sheet.png');
  await contactSheet(annotatedFiles, sheet, stills.frames, fps);

  const { score, counts, passed } = scoreFindings(findings);
  const historyPath = join(dir, 'history.json');
  const history: { at: string; score: number; errors: number; warnings: number }[] = existsSync(historyPath)
    ? JSON.parse(readFileSync(historyPath, 'utf8'))
    : [];
  history.push({ at: new Date().toISOString(), score, errors: counts.error, warnings: counts.warn });

  const result: ReviewResult = {
    slug: job.slug,
    template: job.template,
    score,
    passed,
    counts,
    durationSeconds: seconds,
    findings,
    frames,
    sheet: rel(sheet),
    report: rel(join(dir, 'report.md')),
  };
  writeFileSync(join(dir, 'report.json'), `${JSON.stringify(result, null, 2)}\n`);
  writeFileSync(join(dir, 'report.md'), markdown(result, history));
  writeFileSync(historyPath, `${JSON.stringify(history, null, 2)}\n`);
  return result;
}

/** Script text of a job (narration), for the reviewer to read alongside frames. */
export function narration(props: Record<string, unknown>): string {
  const scenes = Array.isArray(props.scenes) ? (props.scenes as Scene[]) : [];
  return scenes
    .map((s) => stripAudioTags(String(s.say ?? '')).replace(/\*/g, ''))
    .filter(Boolean)
    .join(' ');
}
