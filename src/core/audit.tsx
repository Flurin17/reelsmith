/**
 * Frame audit — the measuring half of `reelsmith review`.
 *
 * When a composition is rendered with the input prop `__audit: true`, this
 * component measures the live DOM of the current frame and logs findings as
 * one JSON console line (collected by the CLI via `onBrowserLog`). It draws
 * nothing, so audited frames look exactly like normal renders.
 *
 * Mark purely decorative text (tickers, giant ghost numbers, watermarks that
 * intentionally bleed) with `data-audit="decorative"` to exclude it.
 */
import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { getTheme } from '../theme/context';
import { ensureThemeFonts } from '../theme/fonts';

export const AUDIT_PREFIX = '__REELSMITH_AUDIT__';

export type AuditRule =
  | 'text-off-canvas'
  | 'text-clipped'
  | 'platform-ui-overlap'
  | 'text-overlap'
  | 'text-too-small'
  | 'low-contrast'
  | 'image-missing';

export interface AuditIssue {
  rule: AuditRule;
  severity: 'error' | 'warn';
  message: string;
  /** Box in composition pixels, for annotation. */
  box: { x: number; y: number; w: number; h: number };
  text?: string;
}

export interface AuditFrame {
  frame: number;
  textCount: number;
  mediaCount: number;
  issues: AuditIssue[];
  /** Visible text boxes (up to 40) for the pixel checks (painted? contrast?). */
  texts: { text: string; box: Rect; font: number; color: string; shadow: boolean }[];
}

/**
 * Areas covered by TikTok / Reels / Shorts UI on a 1080×1920 frame: status +
 * tabs at the top, caption/username block at the bottom, action rail on the
 * right. Text there will be hidden on real phones.
 */
export const PLATFORM_UI = [
  { name: 'top bar', x: 0, y: 0, w: 1080, h: 130 },
  { name: 'caption area', x: 0, y: 1600, w: 1080, h: 320 },
  { name: 'action rail', x: 950, y: 900, w: 130, h: 700 },
];

export type Rect = { x: number; y: number; w: number; h: number };

const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const overlapArea = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

function parseColor(value: string): [number, number, number, number] | null {
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1]
    .split(/[ ,/]+/)
    .filter(Boolean)
    .map(Number);
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

function luminance([r, g, b]: [number, number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: [number, number, number, number], b: [number, number, number, number]): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

function effectiveOpacity(el: Element, root: Element): number {
  let o = 1;
  let node: Element | null = el;
  while (node && node !== root.parentElement) {
    const s = getComputedStyle(node);
    if (s.visibility === 'hidden' || s.display === 'none') return 0;
    o *= Number(s.opacity);
    node = node.parentElement;
  }
  return o;
}

const isDecorative = (el: Element) => Boolean(el.closest('[data-audit="decorative"]'));

let measureCtx: CanvasRenderingContext2D | null = null;

/**
 * Tighten a single-line text box to the glyphs' real ink (cap/ascender to
 * descender) using canvas metrics. Layout boxes include the font's full
 * ascent/descent, which for display faces is far taller than the letters.
 */
function inkBox(el: Element, text: string, rect: Rect): Rect {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return rect;
  const s = getComputedStyle(el);
  measureCtx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  const m = measureCtx.measureText(text);
  const box = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
  if (!box || rect.h > box * 1.6) return rect; // wrapped text: keep the layout box
  const k = rect.h / box; // transforms (scale) applied to this text
  const top = rect.y + (m.fontBoundingBoxAscent - m.actualBoundingBoxAscent) * k;
  const bottom = rect.y + (m.fontBoundingBoxAscent + m.actualBoundingBoxDescent) * k;
  return { x: rect.x, y: top, w: rect.w, h: Math.max(1, bottom - top) };
}

function audit(root: HTMLElement, frame: number, width: number, height: number): AuditFrame {
  const origin = root.getBoundingClientRect();
  const scale = origin.width / width || 1;
  const toRect = (r: DOMRect): Rect => ({
    x: (r.left - origin.left) / scale,
    y: (r.top - origin.top) / scale,
    w: r.width / scale,
    h: r.height / scale,
  });
  const issues: AuditIssue[] = [];
  const texts: { el: Element; rect: Rect; ink: Rect; text: string; font: number; color: string; shadow: boolean }[] =
    [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Set<Element>();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    const text = node.textContent?.trim() ?? '';
    if (!el || !text || seen.has(el) || isDecorative(el)) continue;
    if (effectiveOpacity(el, root) < 0.35) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const r = range.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    seen.add(el);
    const rect = toRect(r);
    const cs = getComputedStyle(el);
    texts.push({
      el,
      rect,
      ink: inkBox(el, text, rect),
      text: text.slice(0, 60),
      font: parseFloat(cs.fontSize),
      color: cs.color,
      shadow: Boolean(cs.textShadow && cs.textShadow !== 'none'),
    });
  }

  for (const t of texts) {
    const { rect, el, text } = t;
    const style = getComputedStyle(el);
    const fontPx = parseFloat(style.fontSize);

    if (rect.x < -1 || rect.y < -1 || rect.x + rect.w > width + 1 || rect.y + rect.h > height + 1) {
      issues.push({
        rule: 'text-off-canvas',
        severity: 'error',
        message: 'Text runs off the edge of the frame',
        box: rect,
        text,
      });
      continue;
    }

    // Clipped by an ancestor with overflow hidden/clip.
    let parent = el.parentElement;
    while (parent && parent !== root) {
      const ps = getComputedStyle(parent);
      const intentional = parent.getAttribute('data-audit') === 'reveal';
      if (/(hidden|clip)/.test(ps.overflow + ps.overflowX + ps.overflowY) && !isDecorative(parent) && !intentional) {
        const pr = toRect(parent.getBoundingClientRect());
        // Glyph boxes include ascender/descender space beyond a tight line-height,
        // so allow some vertical slack; horizontal clipping is judged strictly.
        const slack = fontPx * 0.35;
        if (
          rect.x < pr.x - 2 ||
          rect.x + rect.w > pr.x + pr.w + 2 ||
          rect.y < pr.y - slack ||
          rect.y + rect.h > pr.y + pr.h + slack
        ) {
          issues.push({
            rule: 'text-clipped',
            severity: 'error',
            message: 'Text is cut off by its container',
            box: rect,
            text,
          });
          break;
        }
      }
      parent = parent.parentElement;
    }

    for (const zone of PLATFORM_UI) {
      if (overlapArea(rect, zone) > rect.w * rect.h * 0.25) {
        issues.push({
          rule: 'platform-ui-overlap',
          severity: 'warn',
          message: `Text sits under the platform ${zone.name} and may be hidden on phones`,
          box: rect,
          text,
        });
        break;
      }
    }

    // "detail" zones (e.g. UI inside a phone mockup) may use small text.
    if (fontPx < 28 && !el.closest('[data-audit="detail"]')) {
      issues.push({
        rule: 'text-too-small',
        severity: 'warn',
        message: `${Math.round(fontPx)}px text is hard to read on a phone (use ≥ 28px)`,
        box: rect,
        text,
      });
    }
  }

  // Overlapping text from unrelated elements, compared on real glyph ink so
  // tight-but-clean headline stacks don't count as collisions.
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i];
      const b = texts[j];
      const ra = a.ink;
      const rb = b.ink;
      if (a.el.contains(b.el) || b.el.contains(a.el) || !intersects(ra, rb)) continue;
      const area = overlapArea(ra, rb);
      if (area > Math.min(ra.w * ra.h, rb.w * rb.h) * 0.15) {
        issues.push({
          rule: 'text-overlap',
          severity: 'warn',
          message: `"${a.text}" overlaps "${b.text}"`,
          box: {
            x: Math.min(a.rect.x, b.rect.x),
            y: Math.min(a.rect.y, b.rect.y),
            w: Math.max(a.rect.x + a.rect.w, b.rect.x + b.rect.w) - Math.min(a.rect.x, b.rect.x),
            h: Math.max(a.rect.y + a.rect.h, b.rect.y + b.rect.h) - Math.min(a.rect.y, b.rect.y),
          },
        });
      }
    }
  }

  const media = [...root.querySelectorAll('img, video, canvas')];
  for (const img of root.querySelectorAll('img')) {
    if (img.complete && img.naturalWidth === 0) {
      issues.push({
        rule: 'image-missing',
        severity: 'error',
        message: `Image failed to load: ${img.getAttribute('src')}`,
        box: toRect(img.getBoundingClientRect()),
      });
    }
  }

  return {
    frame,
    textCount: texts.length,
    mediaCount: media.length,
    issues,
    texts: texts
      .slice(0, 40)
      .map((t) => ({ text: t.text, box: t.ink, font: t.font, color: t.color, shadow: t.shadow })),
  };
}

/**
 * Log from an anonymous function: Remotion forwards it to `onBrowserLog`
 * (which the CLI reads) but, lacking a bundle source location, does not also
 * echo it to the terminal.
 */
// eslint-disable-next-line no-new-func
const emit = new Function('line', 'console.log(line)') as (line: string) => void;

/** Wraps a composition; measures + logs when `enabled`. */
export const Auditor: React.FC<{ enabled: boolean; brand?: string; children: React.ReactNode }> = ({
  enabled,
  brand,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  useLayoutEffect(() => {
    if (!enabled || !ref.current) return;
    const handle = delayRender(`audit frame ${frame}`);
    let cancelled = false;
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        continueRender(handle);
      }
    };
    // Measure only once the frame is final: brand fonts loaded (fallback-font
    // metrics give wrong boxes), images decoded, then two frames for layout.
    const settle = async () => {
      await ensureThemeFonts(getTheme(brand)).catch(() => undefined);
      await document.fonts.ready;
      const imgs = [...(ref.current?.querySelectorAll('img') ?? [])];
      await Promise.all(imgs.map((img) => (img.complete ? null : img.decode().catch(() => undefined))));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    };
    settle().then(() => {
      if (cancelled) return;
      try {
        if (ref.current) emit(AUDIT_PREFIX + JSON.stringify(audit(ref.current, frame, width, height)));
      } finally {
        release();
      }
    });
    return () => {
      cancelled = true;
      release();
    };
  }, [enabled, brand, frame, width, height]);

  return <AbsoluteFill ref={ref}>{children}</AbsoluteFill>;
};
