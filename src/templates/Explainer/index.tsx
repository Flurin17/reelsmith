import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import config from '../../../reelsmith.config';
import { musicSchema, sfxSchema } from '../../core/schemas';
import { placeScenes, resolveScenes, sceneFields, sceneWords } from '../../core/scenes';
import { SAFE, VIDEO, defineTemplate, jobProps } from '../../core/template';
import type { Placed } from '../../core/timeline';
import { useTheme } from '../../theme/context';
import {
  Captions,
  Chip,
  Counter,
  DomainCta,
  DomainCtaSfx,
  Frame,
  Music,
  Price,
  Product,
  Reveal,
  Sfx,
  Surface,
  Text,
  Voiceover,
  Words,
  fitSize,
} from '../../theme/primitives';
import type { Tone } from '../../theme/types';

/**
 * Narrated explainer: one idea per scene — kicker, headline, a visual — on
 * the brand's tones, with synced captions. Scenes wipe in; timing follows
 * the voiceover (or the length of `say`).
 */
const card = z.object({ label: z.string(), image: z.string().default(''), note: z.string().default('') });
const visual = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('product'),
    image: z.string(),
    label: z.string().default(''),
    price: z.number().optional(),
  }),
  z.object({ type: z.literal('versus'), left: card, right: card }),
  z.object({ type: z.literal('list'), items: z.array(z.string()).min(1).max(4) }),
  z.object({
    type: z.literal('stat'),
    value: z.number(),
    prefix: z.string().default(''),
    suffix: z.string().default(''),
    label: z.string().default(''),
  }),
  z.object({ type: z.literal('quote'), text: z.string(), author: z.string().default('') }),
  z.object({ type: z.literal('cta') }),
]);
type Visual = z.infer<typeof visual>;

const scene = z.object({
  ...sceneFields,
  kicker: z.string().default(''),
  headline: z.string().default('').describe('≤ 7 words; *word* = emphasis'),
  body: z.string().default('').describe('one short supporting line'),
  visual: visual.optional(),
  tone: z.number().int().min(0).optional().describe('index into the brand tones; default cycles'),
});
type Scene = z.infer<typeof scene>;

const schema = jobProps({
  scenes: z.array(scene).min(1),
  showCaptions: z.boolean().default(true).describe('show word captions of `say`'),
  cta: z.string().default('Explore more on').describe('kicker for cta visuals'),
  music: musicSchema,
  sfx: sfxSchema,
});
type Props = z.infer<typeof schema>;

const WIPE = 14;
/** CTA scenes hold after the narration so the domain can finish typing. */
const CTA_HOLD = Math.round(2.4 * VIDEO.fps);
const extra = (s: Scene) => (s.visual?.type === 'cta' ? CTA_HOLD : 0);

const VisualView: React.FC<{ v: Visual; tone: Tone; cta: string }> = ({ v, tone, cta }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  switch (v.type) {
    case 'product':
      return (
        <Reveal kind="pop" delay={10}>
          <div style={{ position: 'relative' }}>
            <Product image={v.image} label={v.label} size={560} glow float tone={tone} />
            {v.price != null ? (
              <div style={{ position: 'absolute', right: -30, bottom: 40 }}>
                <Price value={v.price} variant="tag" size={220} delay={22} tone={tone} />
              </div>
            ) : null}
          </div>
        </Reveal>
      );
    case 'versus':
      return (
        <div style={{ position: 'relative', display: 'flex', gap: 34, width: '100%' }}>
          {[v.left, v.right].map((c, i) => (
            <Reveal key={i} kind="rise" delay={8 + i * 8} style={{ flex: 1 }}>
              <Surface
                tone={tone}
                style={{
                  padding: 28,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 18,
                  height: 600,
                }}
              >
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <Product image={c.image} label={c.label} size={330} />
                </div>
                <Text variant="title" size={54} color={t.colors.text} align="center">
                  {c.label}
                </Text>
                {c.note ? (
                  <Text size={30} color={t.colors.muted} align="center">
                    {c.note}
                  </Text>
                ) : null}
              </Surface>
            </Reveal>
          ))}
          <div
            style={{
              ...t.type('title'),
              position: 'absolute',
              left: '50%',
              top: '42%',
              translate: '-50% -50%',
              width: 110,
              height: 110,
              borderRadius: '50%',
              background: tone.accent,
              color: tone.onAccent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 44,
              scale: t.pop(frame, 30, 20),
              boxShadow: t.shadow(tone.accent, 0.6),
            }}
          >
            vs
          </div>
        </div>
      );
    case 'list':
      return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {v.items.map((item, i) => (
            <Reveal key={i} delay={10 + i * 9} kind="slide">
              <Surface tone={tone} style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '26px 32px' }}>
                <div
                  style={{
                    ...t.type('display'),
                    fontSize: 64,
                    color: t.colors.primary,
                    width: 70,
                    textAlign: 'center',
                  }}
                >
                  {i + 1}
                </div>
                <Text size={44} color={t.colors.text} over={{ weight: 600 }}>
                  {item}
                </Text>
              </Surface>
            </Reveal>
          ))}
        </div>
      );
    case 'stat':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              ...t.type('display'),
              fontSize: fitSize(t, `${v.prefix}${v.value.toLocaleString(t.locale)}${v.suffix}`, {
                width: 880,
                lines: 1,
                max: 320,
                min: 120,
              }),
              lineHeight: 0.9,
              color: tone.text,
              whiteSpace: 'nowrap',
            }}
          >
            <Counter value={v.value} prefix={v.prefix} suffix={v.suffix} delay={6} />
          </div>
          {v.label ? (
            <Reveal delay={20}>
              <Chip tone={tone} filled>
                {v.label}
              </Chip>
            </Reveal>
          ) : null}
        </div>
      );
    case 'quote':
      return (
        <Reveal delay={8} kind="fade" style={{ width: '100%' }}>
          <div
            style={{
              ...t.type('display', { italic: true }),
              fontSize: fitSize(t, v.text, { width: 880, lines: 4, max: 96, min: 52 }),
              color: tone.text,
              textAlign: 'center',
            }}
          >
            <span style={{ color: tone.accent }}>“</span>
            {v.text}
            <span style={{ color: tone.accent }}>”</span>
          </div>
          {v.author ? (
            <div
              style={{
                ...t.type('label'),
                fontSize: 30,
                marginTop: 30,
                textAlign: 'center',
                color: tone.muted ?? tone.text,
              }}
            >
              — {v.author}
            </div>
          ) : null}
        </Reveal>
      );
    case 'cta':
      return <DomainCta kicker={cta} tone={tone} look="bar" />;
  }
};

const SceneView: React.FC<{ s: Placed<Scene>; index: number; props: Props }> = ({ s, index, props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const tone = t.tone(s.tone ?? index);
  const wipe = index === 0 ? 1 : t.enter(frame, 0, WIPE);
  const words = sceneWords(s, fps, extra(s));
  const showCaps = props.showCaptions && words.length > 0 && s.visual?.type !== 'cta';
  const headSize = s.headline ? fitSize(t, s.headline, { width: 900, lines: 3, max: 128, min: 64 }) : 0;

  return (
    <AbsoluteFill style={{ clipPath: `inset(${(1 - wipe) * 100}% 0 0 0)` }}>
      <Frame tone={tone} seed={s.id} justify="flex-start" gap={30}>
        <div style={{ height: 30 }} />
        {s.kicker ? (
          <Reveal delay={4}>
            <Chip tone={tone}>{s.kicker}</Chip>
          </Reveal>
        ) : null}
        {s.headline ? (
          <Words text={s.headline} size={headSize} delay={6} emphasis="color" accent={tone.accent} color={tone.text} />
        ) : null}
        {s.body ? (
          <Reveal delay={16}>
            <Text size={40} color={tone.muted ?? tone.text} align="center" style={{ maxWidth: 860 }}>
              {s.body}
            </Text>
          </Reveal>
        ) : null}
        {s.visual ? (
          <div
            style={{
              flex: 1,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingBottom: showCaps ? 150 : 0,
            }}
          >
            <VisualView v={s.visual} tone={tone} cta={props.cta} />
          </div>
        ) : null}
      </Frame>
      {showCaps ? <Captions words={words} tone={tone} bottom={SAFE.bottom + 20} /> : null}
    </AbsoluteFill>
  );
};

const Explainer: React.FC<Props> = (props) => {
  const { fps } = useVideoConfig();
  const t = useTheme();
  const scenes = placeScenes(props.scenes, fps, { extra });
  const { sfx } = props;
  return (
    <AbsoluteFill style={{ background: t.tone(0).bg }}>
      {scenes.map((s, i) => (
        <Sequence
          key={s.id}
          from={s.from}
          durationInFrames={s.duration + (i < scenes.length - 1 ? WIPE : 0)}
          name={s.id}
        >
          <SceneView s={s} index={i} props={props} />
        </Sequence>
      ))}
      {scenes.map((s, i) => (
        <React.Fragment key={`a-${s.id}`}>
          <Voiceover file={s.voiceover} from={s.from} duration={s.duration} />
          <Sfx file={i === 0 ? sfx.hit : sfx.swipe} at={s.from} volume={i === 0 ? 0.8 : 0.45} master={sfx.volume} />
          {s.visual?.type === 'cta' ? (
            <DomainCtaSfx from={s.from + 6} tick={sfx.tick} click={sfx.pop} master={sfx.volume} />
          ) : null}
          {s.visual?.type === 'product' && s.visual.price != null ? (
            <Sfx file={sfx.ding} at={s.from + 24} volume={0.5} master={sfx.volume} />
          ) : null}
        </React.Fragment>
      ))}
      <Music file={props.music.file} volume={props.music.volume} />
    </AbsoluteFill>
  );
};

const example = {
  brand: 'lumen',
  scenes: [
    {
      id: 'hook',
      kicker: 'Evening light',
      headline: 'Your lamp is *too bright*',
      say: '[curious] Why does your living room feel like an office at night?',
      visual: { type: 'product', image: 'brands/lumen/products/lamp.svg', label: 'Dome Lamp' },
    },
    {
      id: 'kelvin',
      kicker: 'The fix',
      headline: 'Go warm: *2700 K* or lower',
      say: 'Swap cold white bulbs for warm ones, around twenty-seven hundred kelvin.',
      visual: { type: 'stat', value: 2700, suffix: ' K', label: 'warm white' },
    },
    {
      id: 'layers',
      kicker: 'Then layer it',
      headline: 'Three lights, not one',
      say: 'Use three low lights instead of one bright ceiling lamp.',
      visual: { type: 'list', items: ['Eye-level lamp', 'A candle', 'Nothing overhead'] },
    },
    {
      id: 'cta',
      headline: 'Make evenings *slower*',
      say: '[warmly] Find your lamp on our site.',
      visual: { type: 'cta' },
    },
  ],
};

export default defineTemplate<Props>({
  id: 'Explainer',
  description:
    'Narrated explainer: one idea per scene (product / versus / list / stat / quote / cta) on rotating brand tones, synced captions, wipe transitions.',
  component: Explainer,
  schema,
  defaultProps: schema.parse(example),
  example,
  durationInFrames: 600,
  calculateMetadata: async ({ props }) => {
    const r = await resolveScenes(props.scenes, VIDEO.fps, { tailPadding: config.voice?.tailPadding, extra });
    return { durationInFrames: r.durationInFrames, props: { ...props, scenes: r.scenes } };
  },
  stills: (props) =>
    placeScenes(props.scenes, VIDEO.fps, { extra }).map(
      (s) => s.from + Math.round(s.duration * (s.visual?.type === 'cta' ? 0.95 : 0.6)),
    ),
});
