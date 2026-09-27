import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useTheme } from '../context';
import { displayDomain } from '../format';
import type { Tone } from '../types';
import { Sfx } from './Audio';
import { fitSize } from './Text';

/** Frames before the first keystroke / after the last one until the click. */
const TYPE_START = 8;
const CLICK_DELAY = 14;

/** Keystroke + click timing; typing speed adapts so any domain types in ~2s. */
export function domainCtaTiming(domain: string) {
  const text = displayDomain(domain);
  const perChar = Math.max(2, Math.min(5, Math.floor(60 / Math.max(text.length, 1))));
  const doneFrame = TYPE_START + text.length * perChar;
  return {
    text,
    perChar,
    keyFrames: Array.from({ length: text.length }, (_, i) => TYPE_START + i * perChar),
    doneFrame,
    clickFrame: doneFrame + CLICK_DELAY,
  };
}

/** Characters typed at CTA-relative `frame`. */
export function typedCount(domain: string, frame: number): number {
  const t = domainCtaTiming(domain);
  return Math.min(Math.max(Math.floor((frame - TYPE_START) / t.perChar), 0), t.text.length);
}

/**
 * Soft closing CTA: the brand domain types itself into a pill/bar, then a
 * click pulse. Place it inside a Sequence that starts at the CTA.
 */
export const DomainCta: React.FC<{
  kicker?: string;
  tone?: Tone;
  /** 'bar' = browser address bar, 'pill' = big rounded pill. */
  look?: 'bar' | 'pill';
  domain?: string;
}> = ({ kicker = '', tone, look = 'pill', domain }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const tn = tone ?? t.tone(0);
  const url = domain ?? t.url;
  const { text, doneFrame, clickFrame } = domainCtaTiming(url);
  const typed = typedCount(url, frame);
  const caret = frame < doneFrame || Math.floor((frame / fps) * 2) % 2 === 0;
  const ring = interpolate(frame, [clickFrame, clickFrame + 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const press = interpolate(frame, [clickFrame, clickFrame + 4, clickFrame + 12], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const enter = t.enter(frame, 0);
  const size = fitSize(t, look === 'bar' ? `https://${text}` : text, {
    width: look === 'pill' ? 780 : 720,
    lines: 1,
    max: look === 'pill' ? 76 : 54,
    min: 30,
    variant: look === 'pill' ? 'title' : 'body',
  });
  const radius = look === 'pill' ? 999 : Math.min(t.shape.radius, 24);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 30,
        opacity: enter,
        translate: `0px ${(1 - enter) * 40}px`,
      }}
    >
      {kicker ? <div style={{ ...t.type('label'), fontSize: 34, color: tn.muted ?? tn.text }}>{kicker}</div> : null}
      <div style={{ position: 'relative', scale: `${1 - press * 0.04}` }}>
        {ring > 0 && ring < 1 ? (
          <div
            style={{
              position: 'absolute',
              inset: -10,
              borderRadius: radius,
              border: `4px solid ${tn.accent}`,
              scale: `${1 + ring * 0.22}`,
              opacity: 1 - ring,
            }}
          />
        ) : null}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: look === 'pill' ? '26px 48px' : '26px 32px',
            minWidth: look === 'bar' ? 820 : undefined,
            borderRadius: radius,
            background: look === 'pill' ? tn.accent : t.colors.surface,
            color: look === 'pill' ? tn.onAccent : t.colors.text,
            border: t.shape.border ? `${Math.max(2, t.shape.border)}px solid ${tn.text}` : 'none',
            boxShadow: t.shadow(tn.accent),
            ...t.type(look === 'pill' ? 'title' : 'body', { case: 'lower', tracking: 0 }),
            fontSize: size,
            whiteSpace: 'nowrap',
          }}
        >
          {look === 'bar' ? <span style={{ opacity: 0.45 }}>https://</span> : null}
          <span>
            {text.slice(0, typed)}
            <span style={{ opacity: caret ? 1 : 0, marginLeft: 2 }}>|</span>
          </span>
        </div>
      </div>
    </div>
  );
};

/** Keystroke ticks + click for a DomainCta starting at absolute frame `from`. */
export const DomainCtaSfx: React.FC<{ from: number; tick: string; click: string; master: number; domain?: string }> = ({
  from,
  tick,
  click,
  master,
  domain,
}) => {
  const t = useTheme();
  const timing = domainCtaTiming(domain ?? t.url);
  return (
    <>
      {timing.keyFrames.map((at, i) => (
        <Sfx key={i} file={tick} at={from + at} volume={0.45} master={master} seconds={0.4} />
      ))}
      <Sfx file={click} at={from + timing.clickFrame} volume={0.7} master={master} />
    </>
  );
};
