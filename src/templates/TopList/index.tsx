import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { musicSchema, productSchema, sfxSchema } from '../../core/schemas';
import { SAFE, VIDEO, defineTemplate, jobProps } from '../../core/template';
import { useTheme } from '../../theme/context';
import {
  Backdrop,
  Chip,
  DomainCta,
  DomainCtaSfx,
  Logo,
  Marquee,
  Music,
  Price,
  Product,
  Sfx,
  Words,
  fitSize,
} from '../../theme/primitives';
import type { Tone } from '../../theme/types';

/**
 * "Top N" countdown: title slam with ticker bands, then one full-bleed panel
 * per product sliding over the last (giant rank, product, price sticker),
 * ending on a typed-domain CTA. Items are listed in display order; the last
 * one is revealed as #1.
 */
const schema = jobProps({
  title: z.string().default('').describe('default "Top <n>"'),
  subtitle: z.string().default('').describe('theme line, used on the ticker bands'),
  items: z.array(productSchema).min(1).max(10),
  showPrice: z.boolean().default(true),
  cta: z.string().default('Stock up on'),
  seconds: z
    .object({ intro: z.number().default(2), item: z.number().default(2.2), cta: z.number().default(3.4) })
    .prefault({}),
  music: musicSchema,
  sfx: sfxSchema,
});
type Props = z.infer<typeof schema>;

function timing(p: Pick<Props, 'seconds' | 'items'>) {
  const f = (x: number) => Math.round(x * VIDEO.fps);
  const intro = f(p.seconds.intro);
  const item = f(p.seconds.item);
  const ctaAt = intro + item * p.items.length;
  return { intro, item, ctaAt, total: ctaAt + f(p.seconds.cta) };
}

const SLIDE = 12;

/** Panel that slides in from the right over the previous one. */
const Slide: React.FC<{ children: React.ReactNode; first?: boolean }> = ({ children, first }) => {
  const frame = useCurrentFrame();
  const t = useTheme();
  const p = first ? 1 : t.enter(frame, 0, SLIDE);
  return <AbsoluteFill style={{ translate: `${(1 - p) * 100}% 0px`, overflow: 'hidden' }}>{children}</AbsoluteFill>;
};

const LogoBar: React.FC<{ tone: Tone }> = ({ tone }) => (
  <div style={{ position: 'absolute', top: 140, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
    <Logo tone={tone} size={44} />
  </div>
);

const Intro: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
  const t = useTheme();
  const tone = t.tone(0);
  return (
    <AbsoluteFill>
      <Backdrop tone={tone} seed="intro" />
      <LogoBar tone={tone} />
      <AbsoluteFill style={{ justifyContent: 'center', padding: `0 ${SAFE.side}px 360px` }}>
        <Words
          text={title}
          size={fitSize(t, title, { width: 900, lines: 2, max: 380, min: 160 })}
          kind="pop"
          stagger={5}
          emphasis="block"
        />
      </AbsoluteFill>
      {subtitle ? (
        <>
          <Marquee text={subtitle} tone={t.tone(1)} top={1260} rotate={-5} />
          <Marquee text={subtitle} tone={t.tone(2)} top={1400} rotate={4} speed={-5} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

const ItemPanel: React.FC<{ item: Props['items'][number]; rank: number; index: number; showPrice: boolean }> = ({
  item,
  rank,
  index,
  showPrice,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const tone = t.tone(index + 1);
  const tilt = interpolate(t.pop(frame, fps, 4), [0, 1], [index % 2 ? 18 : -18, index % 2 ? 4 : -4]);
  return (
    <AbsoluteFill>
      <Backdrop tone={tone} seed={item.id || item.name} />
      <div
        data-audit="decorative"
        style={{
          ...t.type('display'),
          position: 'absolute',
          left: -30,
          top: 170,
          fontSize: 980,
          lineHeight: 0.8,
          color: 'transparent',
          WebkitTextStroke: `5px ${t.alpha(tone.text, 0.35)}`,
          translate: `${interpolate(frame, [0, 90], [0, -60])}px 0px`,
        }}
      >
        {rank}
      </div>
      <LogoBar tone={tone} />
      <div
        style={{
          ...t.type('display'),
          position: 'absolute',
          right: SAFE.side,
          top: 250,
          fontSize: 120,
          color: tone.onAccent,
          background: tone.accent,
          padding: '6px 24px 0',
          rotate: '3deg',
          scale: t.pop(frame, fps, 2),
        }}
      >
        #{rank}
      </div>
      <div style={{ position: 'absolute', left: '50%', top: 820, translate: '-50% -50%', rotate: `${tilt}deg` }}>
        <div style={{ position: 'relative', scale: interpolate(t.pop(frame, fps, 0), [0, 1], [0.6, 1]) }}>
          <Product image={item.image} label={item.name} size={760} glow float tone={tone} />
          {showPrice ? (
            <div style={{ position: 'absolute', right: -80, top: 420 }}>
              <Price
                value={item.price}
                variant="tag"
                size={250}
                delay={8}
                tone={{ ...tone, accent: tone.text, onAccent: tone.bg }}
              />
            </div>
          ) : null}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: SAFE.side,
          right: SAFE.side,
          top: 1290,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <Words
          text={item.name}
          variant="title"
          size={fitSize(t, item.name, { width: 900, lines: 1, max: 150, min: 80, variant: 'title' })}
          delay={6}
          color={tone.text}
        />
        {item.category ? (
          <Chip tone={tone} filled>
            {item.category}
          </Chip>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/** Payoff shot: every product in a row, popping in from #N to #1. */
const LineUp: React.FC<{ items: Props['items'] }> = ({ items }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTheme();
  const size = Math.min(240, Math.floor(980 / items.length));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4 }}>
      {items.map((item, i) => {
        const s = t.pop(frame, fps, 4 + i * 4);
        return (
          <div
            key={i}
            style={{ scale: s, rotate: `${(i - (items.length - 1) / 2) * 5}deg`, translate: `0px ${(1 - s) * 80}px` }}
          >
            <Product image={item.image} label={item.name} size={size * 1.6} />
          </div>
        );
      })}
    </div>
  );
};

const TopList: React.FC<Props> = (p) => {
  const t = useTheme();
  const tm = timing(p);
  const n = p.items.length;
  const { sfx } = p;
  const ctaTone = t.tone(1);
  return (
    <AbsoluteFill style={{ background: t.tone(0).bg }}>
      <Sequence durationInFrames={tm.intro + SLIDE} name="intro">
        <Intro title={p.title || `Top ${n}`} subtitle={p.subtitle} />
      </Sequence>
      {p.items.map((item, i) => (
        <Sequence
          key={`${item.id}-${i}`}
          from={tm.intro + i * tm.item}
          durationInFrames={tm.item + SLIDE}
          name={item.name}
        >
          <Slide>
            <ItemPanel item={item} rank={n - i} index={i} showPrice={p.showPrice} />
          </Slide>
        </Sequence>
      ))}
      <Sequence from={tm.ctaAt} name="cta">
        <Slide>
          <Backdrop tone={ctaTone} seed="cta" />
          <LogoBar tone={ctaTone} />
          <AbsoluteFill
            style={{ justifyContent: 'center', alignItems: 'center', gap: 56, padding: `0 ${SAFE.side}px` }}
          >
            <LineUp items={p.items} />
            <Words text={p.title || `Top ${n}`} size={210} color={ctaTone.text} kind="pop" />
            <DomainCta kicker={p.cta} tone={{ ...ctaTone, accent: ctaTone.text, onAccent: ctaTone.bg }} look="pill" />
          </AbsoluteFill>
        </Slide>
      </Sequence>

      <Music file={p.music.file} volume={p.music.volume} />
      <Sfx file={sfx.boom} at={3} volume={0.9} master={sfx.volume} />
      {p.items.map((_, i) => (
        <React.Fragment key={i}>
          <Sfx file={sfx.whoosh} at={tm.intro + i * tm.item - 2} volume={0.55} master={sfx.volume} />
          {p.showPrice ? (
            <Sfx file={sfx.ding} at={tm.intro + i * tm.item + 14} volume={0.45} master={sfx.volume} />
          ) : null}
        </React.Fragment>
      ))}
      <Sfx file={sfx.riser} at={tm.ctaAt - 20} volume={0.5} master={sfx.volume} />
      <DomainCtaSfx from={tm.ctaAt} tick={sfx.tick} click={sfx.pop} master={sfx.volume} />
    </AbsoluteFill>
  );
};

const can = (id: string, name: string, price: number, category: string) => ({
  id,
  name,
  price,
  category,
  image: `brands/volt/products/${id.replace('volt-', 'can-')}.svg`,
});

const example = {
  brand: 'volt',
  subtitle: 'Summer flavours',
  items: [
    can('volt-grape', 'Night Grape', 3.29, 'Limited'),
    can('volt-mango', 'Mango Surge', 2.79, 'Tropical'),
    can('volt-ice', 'Arctic Ice', 2.79, 'Original'),
    can('volt-pink', 'Dragon Rush', 2.99, 'Limited'),
    can('volt-lime', 'Lime Strike', 2.99, 'Original'),
  ],
};

export default defineTemplate<Props>({
  id: 'TopList',
  description:
    'Top-N countdown from catalog products: title slam + tickers, full-bleed panels with giant ranks and price stickers, typed CTA.',
  component: TopList,
  schema,
  defaultProps: schema.parse(example),
  example,
  durationInFrames: timing(schema.parse(example)).total,
  calculateMetadata: ({ props }) => ({ durationInFrames: timing(props).total }),
  stills: (props) => {
    const tm = timing(props);
    return [
      Math.round(tm.intro * 0.7),
      ...props.items.map((_, i) => tm.intro + i * tm.item + Math.round(tm.item * 0.65)),
      tm.total - 10,
    ];
  },
});
