import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useBrand } from '../brand/context';
import { SAFE } from '../core/template';
import { displayDomain } from '../brand/format';
import { Sfx } from './Sfx';

/**
 * Soft closing CTA: the domain types itself into a browser address bar with a
 * blinking caret, then a single click on a button. No price, no "buy now" —
 * it reads far less like a hard ad (and gets flagged less on TikTok/Reels).
 */

/** Frames before the first keystroke. */
export const TYPE_START = 8;
/** Frames between the last keystroke and the click. */
export const CLICK_DELAY = 16;

/**
 * Frame offsets (relative to the CTA start) of each key and the click. Typing
 * speed adapts to the domain length so any domain finishes in ~2s at 30fps.
 */
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

/** Characters typed so far at CTA-relative `frame`. */
export function typedCount(domain: string, frame: number): number {
  const t = domainCtaTiming(domain);
  return Math.min(Math.max(Math.floor((frame - TYPE_START) / t.perChar), 0), t.text.length);
}

/** Keystroke ticks + click sound for a DomainTypeCta starting at `from`. */
export const DomainTypeSfx: React.FC<{
  domain: string;
  from: number;
  tick: string;
  click: string;
  master: number;
}> = ({ domain, from, tick, click, master }) => {
  const t = domainCtaTiming(domain);
  return (
    <>
      {t.keyFrames.map((at, i) => (
        <Sfx key={i} file={tick} at={from + at} volume={0.5} master={master} seconds={0.4} />
      ))}
      <Sfx file={click} at={from + t.clickFrame} volume={0.7} master={master} />
    </>
  );
};

export const DomainTypeCta: React.FC<{
  domain: string;
  kicker?: string;
  /** Label of the button that gets "clicked". */
  button?: string;
  /** Scene length in frames; used to fade out at the end. */
  durationInFrames?: number;
}> = ({ domain, kicker = '', button = 'Go', durationInFrames }) => {
  const local = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, font } = useBrand();
  const { text, doneFrame, clickFrame } = domainCtaTiming(domain);
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

  const enter = interpolate(local, [0, 16], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const exit = durationInFrames ? interpolate(local, [durationInFrames - 14, durationInFrames], [1, 0], clamp) : 1;
  const typed = typedCount(domain, local);
  const finished = local >= doneFrame;
  const caretOn = !finished || Math.floor((local / fps) * 2) % 2 === 0;
  const press =
    interpolate(local, [clickFrame, clickFrame + 5], [0, 1], clamp) -
    interpolate(local, [clickFrame + 5, clickFrame + 14], [0, 1], clamp);
  const ring = interpolate(local, [clickFrame, clickFrame + 22], [0, 1], { ...clamp, easing: Easing.out(Easing.ease) });

  return (
    <AbsoluteFill style={{ opacity: enter * exit }}>
      <div
        style={{
          position: 'absolute',
          inset: `0 ${SAFE.side}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 34,
          textAlign: 'center',
          translate: `0px ${interpolate(enter, [0, 1], [26, 0])}px`,
        }}
      >
        {kicker ? (
          <div
            style={{
              display: 'inline-flex',
              padding: '11px 18px',
              border: `1px solid ${colors.ink}`,
              background: colors.surface,
              color: colors.primary,
              fontFamily: font.body,
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            {kicker}
          </div>
        ) : null}

        {/* Browser address bar */}
        <div
          style={{
            width: '100%',
            maxWidth: 900,
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            background: colors.surface,
            border: `2px solid ${colors.ink}`,
            boxShadow: `10px 10px 0 ${colors.primary}`,
            borderRadius: 20,
            padding: '26px 28px',
          }}
        >
          <LockGlyph color={colors.inkMuted} />
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              fontFamily: font.body,
              fontWeight: 800,
              // Fit "https://" + domain inside the ~800px bar.
              fontSize: Math.min(52, Math.floor(1250 / (text.length + 8))),
              letterSpacing: 0.5,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            <span style={{ color: colors.inkMuted }}>https://</span>
            <span style={{ color: colors.ink }}>{text.slice(0, typed)}</span>
            <span
              style={{
                display: 'inline-block',
                width: 4,
                height: '1em',
                marginLeft: 3,
                transform: 'translateY(6px)',
                background: colors.primary,
                opacity: caretOn ? 1 : 0,
              }}
            />
          </div>
        </div>

        {/* Button that gets clicked at the end */}
        <div style={{ position: 'relative' }}>
          {ring > 0 && ring < 1 ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 18,
                border: `3px solid ${colors.primary}`,
                translate: '6px 6px',
                scale: `${1 + ring * 0.35}`,
                opacity: 1 - ring,
              }}
            />
          ) : null}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              background: colors.ink,
              color: colors.surface,
              border: `2px solid ${colors.ink}`,
              boxShadow: `6px 6px 0 ${colors.secondary}`,
              borderRadius: 16,
              padding: '20px 36px',
              fontFamily: font.body,
              fontWeight: 800,
              fontSize: 40,
              letterSpacing: 3,
              textTransform: 'uppercase',
              translate: `${press * 6}px ${press * 6}px`,
            }}
          >
            {button}
            <span style={{ width: 16, height: 16, background: colors.primary }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const LockGlyph: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ flex: 'none', width: 26, height: 30, position: 'relative' }}>
    <div
      style={{ position: 'absolute', top: 12, left: 0, width: 26, height: 18, borderRadius: 5, background: color }}
    />
    <div
      style={{
        position: 'absolute',
        top: 2,
        left: 5,
        width: 16,
        height: 16,
        borderRadius: '8px 8px 0 0',
        border: `4px solid ${color}`,
        borderBottom: 'none',
      }}
    />
  </div>
);
