import React from 'react';
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { useTheme } from '../context';
import type { Tone } from '../types';

/** Static fractal-noise tile; animated by shifting its position each frame. */
const NOISE = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 1.2 -0.1'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)}")`;

/** Film grain overlay (deterministic). `amount` 0–1. */
export const Grain: React.FC<{ amount: number }> = ({ amount }) => {
  const frame = useCurrentFrame();
  if (amount <= 0) return null;
  const x = Math.floor(random(`gx${frame % 12}`) * 240);
  const y = Math.floor(random(`gy${frame % 12}`) * 240);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: NOISE,
        backgroundPosition: `${x}px ${y}px`,
        opacity: amount,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }}
    />
  );
};

/** Slowly orbiting soft color fields (gradient mesh). */
const Mesh: React.FC<{ colors: string[]; bg: string; seed: string }> = ({ colors, bg, seed }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { alpha } = useTheme();
  const t = frame / 30;
  return (
    <AbsoluteFill style={{ background: bg, overflow: 'hidden' }}>
      {colors.map((c, i) => {
        const r = random(`${seed}-${i}`);
        const size = width * (1.1 + r * 0.5);
        const x = width * (0.5 + 0.42 * Math.sin(t * 0.22 + i * 2.1 + r * 6));
        const y = height * (0.5 + 0.34 * Math.cos(t * 0.18 + i * 1.7 + r * 4));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${alpha(c, 0.55)} 0%, ${alpha(c, 0.18)} 38%, ${alpha(c, 0)} 68%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Top light cone + floor glow + vignette, for dark product stages. */
const Spotlight: React.FC<{ bg: string; color: string; accent: string }> = ({ bg, color, accent }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { alpha } = useTheme();
  const drift = Math.sin(frame / 50) * 30;
  return (
    <AbsoluteFill style={{ background: bg, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: width * 0.1 + drift,
          top: height * 0.55,
          width: width * 0.8,
          height: width * 0.8,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(accent, 0.22)} 0%, ${alpha(accent, 0)} 65%)`,
        }}
      />
      {[
        { poly: 'polygon(38% 0, 62% 0, 108% 100%, -8% 100%)', a: 0.07 },
        { poly: 'polygon(43% 0, 57% 0, 92% 100%, 8% 100%)', a: 0.12 },
        { poly: 'polygon(47% 0, 53% 0, 74% 100%, 26% 100%)', a: 0.1 },
      ].map(({ poly, a }) => (
        <div
          key={poly}
          style={{
            position: 'absolute',
            left: 0,
            top: -100,
            width,
            height: height * 0.78,
            clipPath: poly,
            background: `linear-gradient(180deg, ${alpha(color, a * 2.2)} 0%, ${alpha(color, a)} 55%, ${alpha(color, 0)} 100%)`,
          }}
        />
      ))}
      <AbsoluteFill
        style={{ background: `radial-gradient(130% 90% at 50% 40%, transparent 50%, ${alpha(bg, 0.9)} 100%)` }}
      />
    </AbsoluteFill>
  );
};

/** Rotating light rays from the center (energetic, poster-like). */
const Rays: React.FC<{ bg: string; color: string }> = ({ bg, color }) => {
  const frame = useCurrentFrame();
  const { alpha } = useTheme();
  const stripes = Array.from({ length: 16 }, (_, i) =>
    i % 2 === 0
      ? `${alpha(color, 0.09)} ${i * 22.5}deg ${(i + 1) * 22.5}deg`
      : `transparent ${i * 22.5}deg ${(i + 1) * 22.5}deg`,
  ).join(', ');
  return (
    <AbsoluteFill style={{ background: bg, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '46%',
          width: 3200,
          height: 3200,
          translate: '-50% -50%',
          rotate: `${frame * 0.25}deg`,
          background: `conic-gradient(${stripes})`,
        }}
      />
      <AbsoluteFill
        style={{ background: `radial-gradient(70% 50% at 50% 46%, transparent 20%, ${alpha(bg, 0.85)} 100%)` }}
      />
    </AbsoluteFill>
  );
};

/** Faint line grid or dot grid that drifts slowly (editorial paper look). */
const Pattern: React.FC<{ bg: string; ink: string; dots: boolean }> = ({ bg, ink, dots }) => {
  const frame = useCurrentFrame();
  const { alpha } = useTheme();
  const c = alpha(ink, dots ? 0.16 : 0.06);
  return (
    <AbsoluteFill
      style={{
        backgroundColor: bg,
        backgroundImage: dots
          ? `radial-gradient(${c} 2px, transparent 2.5px)`
          : `linear-gradient(90deg, ${c} 2px, transparent 2px), linear-gradient(180deg, ${c} 2px, transparent 2px)`,
        backgroundSize: dots ? '36px 36px' : '54px 54px',
        backgroundPosition: `0px ${-frame * 0.4}px`,
      }}
    />
  );
};

/** Full-frame background in the theme's backdrop style, for a given tone. */
export const DefaultBackdrop: React.FC<{ tone?: Tone; seed?: string }> = ({ tone, seed = 'bg' }) => {
  const t = useTheme();
  const tn = tone ?? t.tone(0);
  let inner: React.ReactNode;
  switch (t.backdrop.kind) {
    case 'mesh':
      inner = <Mesh colors={t.gradient} bg={tn.bg} seed={seed} />;
      break;
    case 'spotlight':
      inner = <Spotlight bg={tn.bg} color={t.gradient[0]} accent={t.gradient[1] ?? tn.accent} />;
      break;
    case 'rays':
      inner = <Rays bg={tn.bg} color={tn.accent} />;
      break;
    case 'grid':
    case 'dots':
      inner = <Pattern bg={tn.bg} ink={tn.text} dots={t.backdrop.kind === 'dots'} />;
      break;
    default:
      inner = <AbsoluteFill style={{ background: tn.bg }} />;
  }
  return (
    <AbsoluteFill>
      {inner}
      <Grain amount={t.backdrop.grain} />
    </AbsoluteFill>
  );
};
