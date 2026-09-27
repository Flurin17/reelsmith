import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import config from '../../../reelsmith.config';
import { groupPhrases } from '../../core/captions';
import { musicSchema, sfxSchema } from '../../core/schemas';
import { placeScenes, resolveScenes, sceneFields, sceneWords } from '../../core/scenes';
import { SAFE, VIDEO, defineTemplate, jobProps } from '../../core/template';
import type { Placed } from '../../core/timeline';
import { useTheme } from '../../theme/context';
import {
  Backdrop,
  DomainCta,
  DomainCtaSfx,
  Logo,
  Music,
  Product,
  Sfx,
  Voiceover,
  fitSize,
} from '../../theme/primitives';
import type { Tone } from '../../theme/types';

/**
 * Faceless narrated reel: the words appear exactly as they are spoken, big,
 * one phrase at a time, over the brand's tones. Mark emphasis with *…* in
 * `say`. Optional product image per scene; `cta: true` ends on the domain.
 */
const scene = z.object({
  ...sceneFields,
  image: z.string().default('').describe('optional product image (public/ path)'),
  tone: z.number().int().min(0).optional().describe('brand tone index; default cycles'),
  cta: z.boolean().default(false).describe('end scene: logo + typed domain'),
});
type Scene = z.infer<typeof scene>;

const schema = jobProps({
  scenes: z.array(scene).min(1),
  wordsPerPhrase: z.number().int().min(1).max(6).default(4),
  music: musicSchema,
  sfx: sfxSchema,
});
type Props = z.infer<typeof schema>;

const CTA_HOLD = Math.round(2.8 * VIDEO.fps);
const extra = (s: Scene) => (s.cta ? CTA_HOLD : 0);
const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
/** Words inside *…* in `say`. */
const hotWords = (say: string) =>
  new Set([...say.matchAll(/\*([^*]+)\*/g)].flatMap((m) => m[1].split(/\s+/).map(norm)));

const Phrase: React.FC<{ s: Placed<Scene>; tone: Tone; perPhrase: number; top: number }> = ({
  s,
  tone,
  perPhrase,
  top,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const words = sceneWords(s, fps, extra(s)).map((w) => ({ ...w, text: w.text.replace(/\*/g, '') }));
  const now = frame / fps;
  const phrases = groupPhrases(words, perPhrase, 0.6);
  const phrase = [...phrases].reverse().find((p) => now >= p[0].start - 0.1) ?? phrases[0];
  if (!phrase) return null;
  const hot = hotWords(s.say);
  const size = fitSize(t, phrase.map((w) => w.text).join(' '), { width: 880, lines: 3, max: 176, min: 96 });
  return (
    <div
      style={{
        ...t.type('display'),
        position: 'absolute',
        left: SAFE.side,
        right: SAFE.side,
        top,
        fontSize: size,
        color: tone.text,
        display: 'flex',
        flexWrap: 'wrap',
        columnGap: '0.22em',
      }}
    >
      {phrase.map((w, i) => {
        const at = Math.round(w.start * fps);
        const p = t.enter(frame, at - 2, Math.max(8, t.motion.enter - 8));
        const spoken = now >= w.start - 0.06;
        const isHot = hot.has(norm(w.text));
        return (
          <span
            key={`${w.start}-${i}`}
            style={{
              display: 'inline-block',
              opacity: spoken ? 0.25 + 0.75 * p : 0.22,
              filter: spoken ? `blur(${(1 - p) * 10}px)` : 'none',
              translate: `0px ${spoken ? (1 - p) * 26 : 0}px`,
              color: isHot ? tone.accent : tone.text,
              fontStyle: isHot ? 'italic' : undefined,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

const SceneView: React.FC<{ s: Placed<Scene>; index: number; total: number; props: Props }> = ({
  s,
  index,
  total,
  props,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const tone = t.tone(s.tone ?? index);
  const fade = index === 0 ? 1 : t.enter(frame, 0, 12);
  const sticker = t.pop(frame, fps, 10);
  const ctaAt = s.duration - CTA_HOLD;
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <Backdrop tone={tone} seed={s.id} />
      <div style={{ position: 'absolute', top: 140, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Logo tone={tone} size={44} />
      </div>
      <div style={{ position: 'absolute', top: 236, left: SAFE.side, right: SAFE.side, display: 'flex', gap: 10 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{ flex: 1, height: 6, borderRadius: 3, background: tone.text, opacity: i <= index ? 0.85 : 0.2 }}
          />
        ))}
      </div>
      <div
        style={{
          ...t.type('label'),
          position: 'absolute',
          top: 280,
          left: SAFE.side,
          fontSize: 28,
          color: tone.muted ?? tone.text,
        }}
      >
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </div>

      <Phrase s={s} tone={tone} perPhrase={props.wordsPerPhrase} top={s.cta ? 440 : s.image ? 520 : 720} />

      {s.image ? (
        <div
          style={{
            position: 'absolute',
            right: SAFE.side,
            top: 1120,
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: t.alpha(t.colors.surface, 0.85),
            boxShadow: t.shadow(tone.accent),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            scale: sticker,
            rotate: `${interpolate(sticker, [0, 1], [-30, 6])}deg`,
          }}
        >
          <Product image={s.image} size={300} float tone={tone} />
        </div>
      ) : null}

      {s.cta ? (
        <Sequence from={ctaAt} layout="none">
          <div
            style={{ position: 'absolute', left: 0, right: 0, top: 1150, display: 'flex', justifyContent: 'center' }}
          >
            <DomainCta tone={tone} look="pill" kicker={t.tagline} />
          </div>
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

const KineticCaptions: React.FC<Props> = (props) => {
  const { fps } = useVideoConfig();
  const scenes = placeScenes(props.scenes, fps, { extra });
  const { sfx } = props;
  return (
    <AbsoluteFill>
      {scenes.map((s, i) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.duration + (i < scenes.length - 1 ? 12 : 0)} name={s.id}>
          <SceneView s={s} index={i} total={scenes.length} props={props} />
        </Sequence>
      ))}
      {scenes.map((s, i) => (
        <React.Fragment key={`a-${s.id}`}>
          <Voiceover file={s.voiceover} from={s.from} duration={s.duration} />
          <Sfx file={i === 0 ? sfx.hit : sfx.swipe} at={s.from} volume={i === 0 ? 0.6 : 0.35} master={sfx.volume} />
          {s.image ? <Sfx file={sfx.pop} at={s.from + 12} volume={0.4} master={sfx.volume} /> : null}
          {s.cta ? (
            <DomainCtaSfx from={s.from + s.duration - CTA_HOLD} tick={sfx.tick} click={sfx.ding} master={sfx.volume} />
          ) : null}
        </React.Fragment>
      ))}
      <Music file={props.music.file} volume={props.music.volume} />
    </AbsoluteFill>
  );
};

const example = {
  brand: 'kin',
  scenes: [
    { id: 'hook', say: '[softly] You do *not* need a ten-step routine.' },
    { id: 'clean', say: 'Start with a cleanser that *never* strips.', image: 'brands/kin/products/cleanser.svg' },
    { id: 'serum', say: 'Then one serum for your *barrier*.', image: 'brands/kin/products/serum.svg' },
    { id: 'cream', say: 'Seal it in with a light *cream*. That is it.', image: 'brands/kin/products/cream.svg' },
    { id: 'cta', say: '[warmly] Three steps. *Better* skin.', cta: true },
  ],
};

export default defineTemplate<Props>({
  id: 'KineticCaptions',
  description:
    'Faceless narrated reel: words appear exactly as spoken, phrase by phrase, on the brand tones; *emphasis* in `say`, optional product per scene, typed CTA.',
  component: KineticCaptions,
  schema,
  defaultProps: schema.parse(example),
  example,
  durationInFrames: 600,
  calculateMetadata: async ({ props }) => {
    const r = await resolveScenes(props.scenes, VIDEO.fps, { tailPadding: config.voice?.tailPadding, extra });
    return { durationInFrames: r.durationInFrames, props: { ...props, scenes: r.scenes } };
  },
  stills: (props) =>
    placeScenes(props.scenes, VIDEO.fps, { extra }).map((s) => s.from + Math.round(s.duration * (s.cta ? 0.93 : 0.6))),
});
