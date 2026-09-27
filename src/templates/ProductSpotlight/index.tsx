import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { musicSchema, sfxSchema } from '../../core/schemas';
import { SAFE, VIDEO, defineTemplate, jobProps } from '../../core/template';
import { useTheme } from '../../theme/context';
import {
  Backdrop,
  Chip,
  DomainCta,
  DomainCtaSfx,
  Logo,
  Music,
  Price,
  Product,
  Reveal,
  Sfx,
  Surface,
  Words,
  fitSize,
} from '../../theme/primitives';

/**
 * One product on one continuous stage: kinetic hook → product rises into
 * frame with price → feature cards → typed-domain CTA. The product glides
 * between poses instead of cutting away.
 */
const schema = jobProps({
  hook: z.string().default('').describe('2–6 words; *word* = emphasis. Default: product name'),
  name: z.string().min(1),
  subtitle: z.string().default('').describe('small line under the name, e.g. category'),
  price: z.number().nonnegative().optional().describe('omit to hide the price'),
  features: z.array(z.string()).max(4).default([]).describe('2–4 short lines, ≤5 words each'),
  image: z.string().default('').describe('path in public/ or URL'),
  cta: z.string().default('Discover more on').describe('kicker above the typed domain'),
  seconds: z
    .object({
      hook: z.number().default(2.2),
      reveal: z.number().default(3.4),
      features: z.number().default(5),
      cta: z.number().default(3.6),
    })
    .prefault({}),
  music: musicSchema,
  sfx: sfxSchema,
});
type Props = z.infer<typeof schema>;

function timing(s: Props['seconds']) {
  const f = (x: number) => Math.round(x * VIDEO.fps);
  const reveal = f(s.hook);
  const features = reveal + f(s.reveal);
  const cta = features + f(s.features);
  return { reveal, features, cta, total: cta + f(s.cta) };
}

const ProductSpotlight: React.FC<Props> = (p) => {
  const frame = useCurrentFrame();
  const t = useTheme();
  const tone = t.tone(0);
  const tm = timing(p.seconds);
  const hook = p.hook || p.name;
  const features = p.features.length ? p.features : p.subtitle ? [p.subtitle] : [];
  const e = (from: number, to: number) =>
    interpolate(frame, [from, to], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: t.ease });

  // Product pose: below frame → center → upper third → small for the CTA.
  const up = e(tm.reveal - 8, tm.reveal + 22);
  const toTop = e(tm.features, tm.features + 20);
  const toCta = e(tm.cta, tm.cta + 20);
  const y = interpolate(up, [0, 1], [1500, 880]) - toTop * 200 - toCta * 40;
  const scale = interpolate(up, [0, 1], [0.7, 1]) * (1 - toTop * 0.34) * (1 - toCta * 0.12);
  const nameIn = e(tm.reveal + 12, tm.reveal + 30) * (1 - e(tm.features - 6, tm.features + 6));
  const { sfx } = p;

  return (
    <AbsoluteFill>
      <Backdrop tone={tone} seed={p.name} />

      <div style={{ position: 'absolute', top: 140, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Logo tone={tone} size={40} />
      </div>

      <Sequence durationInFrames={tm.reveal} name="hook">
        <AbsoluteFill
          style={{ justifyContent: 'center', padding: `0 ${SAFE.side}px`, opacity: 1 - e(tm.reveal - 10, tm.reveal) }}
        >
          <Words
            text={hook}
            size={fitSize(t, hook, { width: 900, lines: 3, max: 190, min: 96 })}
            emphasis="block"
            delay={4}
          />
        </AbsoluteFill>
      </Sequence>

      <div style={{ position: 'absolute', left: '50%', top: y, translate: '-50% -50%', scale, opacity: up }}>
        <div style={{ position: 'relative' }}>
          <Product image={p.image} label={p.name} size={700} glow reflection float />
          {p.price != null ? (
            <div style={{ position: 'absolute', top: 10, right: -40, opacity: 1 - toCta }}>
              <Price value={p.price} variant="badge" size={230} delay={tm.reveal + 22} />
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: SAFE.side,
          right: SAFE.side,
          top: 1270,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 22,
          opacity: nameIn,
          translate: `0px ${(1 - nameIn) * 30}px`,
        }}
      >
        <Words
          text={p.name}
          variant="title"
          size={fitSize(t, p.name, { width: 900, lines: 1, max: 118, min: 64, variant: 'title' })}
          delay={tm.reveal + 12}
        />
        {p.subtitle ? <Chip tone={tone}>{p.subtitle}</Chip> : null}
      </div>

      <Sequence from={tm.features} durationInFrames={tm.cta - tm.features} name="features">
        <AbsoluteFill
          style={{
            padding: `1010px ${SAFE.side}px 0`,
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
            opacity:
              1 -
              interpolate(frame, [tm.cta - 10, tm.cta], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
          }}
        >
          {features.map((f, i) => (
            <Reveal key={i} delay={10 + i * 12} kind="rise">
              <Surface
                variant="glass"
                tone={tone}
                style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '26px 34px' }}
              >
                <div
                  style={{
                    ...t.type('label'),
                    flex: 'none',
                    width: 58,
                    height: 58,
                    borderRadius: Math.min(t.shape.radius, 29),
                    background: tone.accent,
                    color: tone.onAccent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    letterSpacing: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ ...t.type('body', { weight: 600 }), fontSize: 46, color: tone.text }}>{f}</div>
              </Surface>
            </Reveal>
          ))}
        </AbsoluteFill>
      </Sequence>

      <Sequence from={tm.cta} name="cta">
        <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: 1180 }}>
          <DomainCta kicker={p.cta} tone={tone} look="pill" />
        </AbsoluteFill>
      </Sequence>

      <Music file={p.music.file} volume={p.music.volume} />
      <Sfx file={sfx.boom} at={4} volume={0.7} master={sfx.volume} />
      <Sfx file={sfx.riser} at={tm.reveal - 22} volume={0.45} master={sfx.volume} />
      <Sfx file={sfx.whoosh} at={tm.reveal - 6} volume={0.6} master={sfx.volume} />
      {p.price != null ? <Sfx file={sfx.ding} at={tm.reveal + 26} volume={0.55} master={sfx.volume} /> : null}
      {features.map((_, i) => (
        <Sfx key={i} file={sfx.pop} at={tm.features + 10 + i * 12} volume={0.45} master={sfx.volume} />
      ))}
      <DomainCtaSfx from={tm.cta} tick={sfx.tick} click={sfx.ding} master={sfx.volume} />
    </AbsoluteFill>
  );
};

const example = {
  brand: 'nocturne',
  hook: 'Forty hours. *Zero* noise.',
  name: 'Nocturne One',
  subtitle: 'Over-ear · Noise cancelling',
  price: 349,
  features: ['40 h battery', 'Adaptive noise cancelling', 'Memory-foam cushions'],
  image: 'brands/nocturne/products/headphones.svg',
};

export default defineTemplate<Props>({
  id: 'ProductSpotlight',
  description:
    'One product, one continuous stage: kinetic hook → product reveal + price → feature cards → typed CTA (~14s).',
  component: ProductSpotlight,
  schema,
  defaultProps: schema.parse(example),
  example,
  durationInFrames: timing(schema.parse(example).seconds).total,
  calculateMetadata: ({ props }) => ({ durationInFrames: timing(props.seconds).total }),
  stills: (props) => {
    const tm = timing(props.seconds);
    return [30, tm.reveal + 50, tm.features + 60, tm.total - 12];
  },
});
