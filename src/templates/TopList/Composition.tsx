import React from 'react';
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useBrand, type BrandKit } from '../../brand/context';
import { DomainTypeCta, DomainTypeSfx } from '../../components/DomainTypeCta';
import { PriceText } from '../../components/Price';
import { ProductImage } from '../../components/ProductImage';
import { Music, Sfx } from '../../components/Sfx';
import type { ProductItem } from '../../core/schemas';
import { SAFE } from '../../core/template';
import { autoSize } from '../../core/text';
import { topListTiming, type TopListProps } from './schema';

const ease = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) } as const;

/** Panel color schemes cycled per item: [background, foreground, sticker]. */
function schemes(b: BrandKit): [string, string, string][] {
  const c = b.colors;
  return [
    [c.primary, c.onPrimary, c.secondary],
    [c.secondary, c.onSecondary, c.primary],
    [c.ink, c.surface, c.secondary],
  ];
}

/** Text that repeats and scrolls sideways, like a ticker band. */
const Marquee: React.FC<{
  text: string;
  color: string;
  background: string;
  top: number;
  speed?: number;
  rotate?: number;
}> = ({ text, color, background, top, speed = 6, rotate = -4 }) => {
  const frame = useCurrentFrame();
  const { font } = useBrand();
  const unit = `${text} ✦ `;
  return (
    <div
      data-audit="decorative"
      style={{
        position: 'absolute',
        left: -200,
        right: -200,
        top,
        background,
        color,
        rotate: `${rotate}deg`,
        padding: '18px 0 12px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        fontFamily: font.display,
        fontSize: 64,
        textTransform: 'uppercase',
      }}
    >
      <div style={{ translate: `${-((frame * speed) % 1400)}px 0px` }}>{unit.repeat(12)}</div>
    </div>
  );
};

/** Brand name in the panel's foreground color (keeps contrast on every panel). */
const Wordmark: React.FC<{ color: string }> = ({ color }) => {
  const { name, font } = useBrand();
  return (
    <div
      style={{
        position: 'absolute',
        top: 150,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: font.display,
        fontSize: 52,
        letterSpacing: 3,
        lineHeight: 1,
        textTransform: 'uppercase',
        color,
      }}
    >
      {name}
    </div>
  );
};

const Intro: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const { colors, font } = brand;
  const [first, ...rest] = title.split(' ');
  const pop = spring({ frame: frame - 3, fps, config: { damping: 11, stiffness: 140 } });

  return (
    <AbsoluteFill style={{ background: colors.ink, overflow: 'hidden' }}>
      <Wordmark color={colors.surface} />
      <Marquee text={subtitle || title} color={colors.onPrimary} background={colors.primary} top={1320} />
      <Marquee
        text={subtitle || title}
        color={colors.onSecondary}
        background={colors.secondary}
        top={1450}
        speed={-5}
        rotate={3}
      />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 380 }}>
        <div
          style={{
            fontFamily: font.display,
            color: colors.surface,
            fontSize: 260,
            lineHeight: 0.95,
            textTransform: 'uppercase',
            translate: `0px ${interpolate(pop, [0, 1], [-200, 0])}px`,
            opacity: pop,
          }}
        >
          {first}
        </div>
        <div
          style={{
            fontFamily: font.display,
            color: colors.secondary,
            fontSize: autoSize(rest.join(' '), 520, 200, 3),
            lineHeight: 0.9,
            marginTop: 24,
            scale: interpolate(pop, [0, 1], [2.2, 1]),
            opacity: pop,
          }}
        >
          {rest.join(' ')}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const ItemPanel: React.FC<{
  item: ProductItem;
  rank: number;
  index: number;
  duration: number;
  showPrice: boolean;
}> = ({ item, rank, index, duration, showPrice }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const { font } = brand;
  const [bg, fg, sticker] = schemes(brand)[index % 3];
  const wipe = interpolate(frame, [0, 12], [100, 0], ease);
  const disc = spring({ frame: frame - 4, fps, config: { damping: 12, stiffness: 120 } });
  const nameIn = interpolate(frame, [8, 20], [0, 1], ease);
  const priceIn = spring({ frame: frame - 14, fps, config: { damping: 8, stiffness: 150 } });
  const drift = interpolate(frame, [0, duration], [0, -40]);
  const isWinner = rank === 1;

  return (
    <AbsoluteFill style={{ background: bg, clipPath: `inset(${wipe}% 0 0 0)`, overflow: 'hidden' }}>
      {/* Giant outlined rank number */}
      <div
        data-audit="decorative"
        style={{
          position: 'absolute',
          top: 130,
          left: 40,
          fontFamily: font.display,
          fontSize: 760,
          lineHeight: 0.8,
          color: 'transparent',
          WebkitTextStroke: `6px ${fg}`,
          opacity: 0.35,
          translate: `${drift}px 0px`,
        }}
      >
        {rank}
      </div>

      <Wordmark color={fg} />
      <Marquee text={item.category || brand.name} color={bg} background={fg} top={1600} speed={5} rotate={-3} />

      {/* Rank chip */}
      <div
        style={{
          position: 'absolute',
          top: SAFE.top + 60,
          right: SAFE.side,
          background: fg,
          color: bg,
          fontFamily: font.display,
          fontSize: 72,
          lineHeight: 1,
          padding: '14px 26px 8px',
          rotate: '4deg',
        }}
      >
        #{rank}
      </div>

      {/* Product on a sticker disc */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 470,
          width: 700,
          height: 700,
          translate: '-50% 0',
          borderRadius: '50%',
          background: brand.colors.surface,
          border: `8px solid ${brand.colors.ink}`,
          boxShadow: `22px 22px 0 ${brand.colors.ink}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          scale: interpolate(disc, [0, 1], [0.4, 1]),
          rotate: `${interpolate(disc, [0, 1], [index % 2 ? 25 : -25, 0])}deg`,
        }}
      >
        <ProductImage image={item.image} label={item.name} maxWidth={470} maxHeight={470} />
      </div>

      {showPrice ? (
        <div
          style={{
            position: 'absolute',
            left: 640,
            top: 1030,
            background: sticker,
            color: sticker === brand.colors.secondary ? brand.colors.onSecondary : brand.colors.onPrimary,
            border: `6px solid ${brand.colors.ink}`,
            padding: '16px 28px 8px',
            fontFamily: font.display,
            rotate: `${interpolate(priceIn, [0, 1], [-30, -8])}deg`,
            scale: priceIn,
          }}
        >
          <PriceText value={item.price} size={84} />
        </div>
      ) : null}

      {/* Name + category */}
      <div
        style={{
          position: 'absolute',
          left: SAFE.side,
          right: SAFE.side,
          top: 1260,
          textAlign: 'center',
          opacity: nameIn,
          translate: `0px ${interpolate(nameIn, [0, 1], [40, 0])}px`,
        }}
      >
        <div
          style={{
            fontFamily: font.display,
            fontSize: autoSize(item.name, 130, 76, 12),
            lineHeight: 0.95,
            color: fg,
            textTransform: 'uppercase',
          }}
        >
          {item.name}
        </div>
        {item.category ? (
          <div
            style={{
              marginTop: 18,
              display: 'inline-block',
              background: fg,
              color: bg,
              fontFamily: font.body,
              fontWeight: 900,
              fontSize: 34,
              letterSpacing: 3,
              padding: '8px 20px',
              textTransform: 'uppercase',
            }}
          >
            {isWinner ? `★ ${item.category}` : item.category}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

export const TopList: React.FC<TopListProps> = (props) => {
  const { colors, url } = useBrand();
  const t = topListTiming(props);
  const n = props.items.length;
  const title = props.title || `Top ${n}`;
  const { sfx } = props;

  return (
    <AbsoluteFill style={{ background: colors.ink }}>
      <Sequence durationInFrames={t.intro + 12} name="intro">
        <Intro title={title} subtitle={props.subtitle} />
      </Sequence>

      {props.items.map((item, i) => (
        <Sequence
          key={`${item.id}-${i}`}
          from={t.intro + i * t.item}
          durationInFrames={t.item + (i === n - 1 ? 12 : 12)}
          name={item.name}
        >
          <ItemPanel item={item} rank={n - i} index={i} duration={t.item} showPrice={props.showPrice} />
        </Sequence>
      ))}

      <Sequence from={t.ctaAt} durationInFrames={t.cta} name="cta">
        <AbsoluteFill style={{ background: colors.secondary }}>
          <DomainTypeCta domain={url} kicker={props.ctaKicker} button={props.ctaButton} durationInFrames={t.cta} />
        </AbsoluteFill>
      </Sequence>

      <Music file={props.music.file} volume={props.music.volume} />
      <Sfx file={sfx.boom} at={4} volume={0.9} master={sfx.volume} />
      {props.items.map((_, i) => (
        <React.Fragment key={i}>
          <Sfx file={sfx.whoosh} at={t.intro + i * t.item} volume={0.55} master={sfx.volume} />
          {props.showPrice ? (
            <Sfx file={sfx.ding} at={t.intro + i * t.item + 16} volume={0.5} master={sfx.volume} />
          ) : null}
        </React.Fragment>
      ))}
      <Sfx file={sfx.riser} at={t.ctaAt - 18} volume={0.6} master={sfx.volume} />
      <DomainTypeSfx domain={url} from={t.ctaAt} tick={sfx.tick} click={sfx.pop} master={sfx.volume} />
    </AbsoluteFill>
  );
};
