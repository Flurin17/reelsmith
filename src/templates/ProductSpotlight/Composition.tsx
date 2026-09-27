import React from 'react';
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useBrand } from '../../brand/context';
import { TEXT_SHADOW } from '../../components/AnimatedText';
import { BrandOverlay } from '../../components/BrandMarks';
import { domainCtaTiming, DomainTypeSfx, typedCount } from '../../components/DomainTypeCta';
import { ParticleOverlay } from '../../components/ParticleOverlay';
import { PriceBadge } from '../../components/Price';
import { ProductImage } from '../../components/ProductImage';
import { Music, Sfx } from '../../components/Sfx';
import { SAFE } from '../../core/template';
import { autoSize } from '../../core/text';
import { spotlightTiming, type ProductSpotlightProps } from './schema';
import { Stage } from './Stage';

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Tween between poses at the given beat frames. */
function pose(frame: number, beats: number[], values: number[]): number {
  return interpolate(frame, beats, values, { ...clamp, easing: ease });
}

/** Hook line: words slam in one by one; *word* gets the highlight color. */
const Hook: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, font } = useBrand();
  const words = text.split(/\s+/).filter(Boolean);
  const size = autoSize(text.replace(/\*/g, ''), 190, 130, 12);

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: `0 ${SAFE.side}px` }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 30px', maxWidth: 900 }}>
        {words.map((raw, i) => {
          const hot = /^\*.*\*[.,!?]?$/.test(raw);
          const word = raw.replace(/\*/g, '');
          const p = spring({ frame: frame - 4 - i * 5, fps, config: { damping: 14, stiffness: 200 } });
          return (
            <span
              key={i}
              style={{
                fontFamily: font.display,
                fontSize: size,
                lineHeight: 1,
                textTransform: 'uppercase',
                color: hot ? colors.night : colors.onNight,
                background: hot ? colors.highlight : 'transparent',
                padding: hot ? '0 16px' : 0,
                textShadow: hot ? 'none' : TEXT_SHADOW,
                opacity: p,
                scale: interpolate(p, [0, 1], [1.8, 1]),
                rotate: hot ? '-3deg' : '0deg',
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const FeatureChips: React.FC<{ features: string[] }> = ({ features }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, font, alpha } = useBrand();
  return (
    <div style={{ position: 'absolute', left: SAFE.side, right: SAFE.side, top: 1060, display: 'grid', gap: 22 }}>
      {features.map((f, i) => {
        const p = spring({ frame: frame - 8 - i * 14, fps, config: { damping: 16, stiffness: 160 } });
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              padding: '24px 30px',
              borderRadius: 26,
              background: alpha(colors.onNight, 0.08),
              border: `2px solid ${alpha(colors.highlight, 0.35)}`,
              boxShadow: `0 20px 50px ${alpha(colors.night, 0.6)}`,
              opacity: p,
              translate: `${interpolate(p, [0, 1], [i % 2 ? 120 : -120, 0])}px 0px`,
            }}
          >
            <div
              style={{
                flex: 'none',
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: colors.accent,
                color: colors.onAccent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: font.display,
                fontSize: 32,
              }}
            >
              {i + 1}
            </div>
            <div
              style={{ fontFamily: font.body, fontWeight: 800, fontSize: 46, lineHeight: 1.1, color: colors.onNight }}
            >
              {f}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TypedDomain: React.FC<{ kicker: string }> = ({ kicker }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, font, url } = useBrand();
  const { text, doneFrame, clickFrame } = domainCtaTiming(url);
  const typed = typedCount(url, frame);
  const caretOn = frame < doneFrame || Math.floor((frame / fps) * 2) % 2 === 0;
  const ring = interpolate(frame, [clickFrame, clickFrame + 24], [0, 1], clamp);
  const enter = interpolate(frame, [0, 14], [0, 1], { ...clamp, easing: ease });

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE.side,
        right: SAFE.side,
        top: 1120,
        display: 'grid',
        justifyItems: 'center',
        gap: 26,
        opacity: enter,
        translate: `0px ${interpolate(enter, [0, 1], [40, 0])}px`,
      }}
    >
      <div
        style={{
          fontFamily: font.body,
          fontWeight: 800,
          fontSize: 40,
          letterSpacing: 5,
          color: colors.highlight,
          textTransform: 'uppercase',
        }}
      >
        {kicker}
      </div>
      <div style={{ position: 'relative' }}>
        {ring > 0 && ring < 1 ? (
          <div
            style={{
              position: 'absolute',
              inset: '-22px -36px',
              borderRadius: 999,
              border: `4px solid ${colors.highlight}`,
              scale: `${1 + ring * 0.25}`,
              opacity: 1 - ring,
            }}
          />
        ) : null}
        <div
          style={{
            padding: '22px 44px',
            borderRadius: 999,
            background: colors.onNight,
            color: colors.night,
            fontFamily: font.display,
            fontSize: Math.min(76, Math.floor(1500 / Math.max(text.length, 10))),
            letterSpacing: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {text.slice(0, typed)}
          <span style={{ color: colors.accent, opacity: caretOn ? 1 : 0 }}>|</span>
        </div>
      </div>
    </div>
  );
};

/**
 * One continuous stage. The product glides between poses:
 * hidden → center (reveal) → upper third (features) → smaller (CTA).
 */
export const ProductSpotlight: React.FC<ProductSpotlightProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, font, url } = useBrand();
  const t = spotlightTiming(props.seconds);
  const hook = props.hook || props.name;
  const features = props.features.length ? props.features : props.subtitle ? [props.subtitle] : [];
  const { sfx } = props;

  const beats = [t.reveal - 6, t.reveal + 18, t.features, t.features + 18, t.cta, t.cta + 18];
  const productY = pose(frame, beats, [1500, 860, 860, 640, 640, 640]);
  const productScale = pose(frame, beats, [0.5, 1, 1, 0.72, 0.72, 0.62]);
  const productOpacity = pose(frame, [t.reveal - 6, t.reveal + 8], [0, 1]);
  const spotlight = pose(frame, [t.reveal - 4, t.reveal + 20, t.cta, t.cta + 20], [0, 1, 1, 0.5]);
  const float = Math.sin(frame / 20) * 10;
  const nameIn = pose(frame, [t.reveal + 10, t.reveal + 26, t.features, t.features + 12], [0, 1, 1, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.night }}>
      <Stage background={props.background} spotlight={spotlight} floorY={productY + 360 * productScale} />
      <ParticleOverlay count={45} seed={`spot-${props.name}`} />

      <Sequence durationInFrames={t.reveal} name="hook">
        <AbsoluteFill style={{ opacity: pose(frame, [t.reveal - 10, t.reveal], [1, 0]) }}>
          <Hook text={hook} />
        </AbsoluteFill>
      </Sequence>

      {/* Product + price */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: productY,
          translate: `-50% calc(-50% + ${float}px)`,
          scale: productScale,
          opacity: productOpacity,
        }}
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <ProductImage image={props.image} label={props.name} maxWidth={720} maxHeight={720} tone="night" />
          {props.showPrice ? (
            <div style={{ position: 'absolute', top: -60, right: -70 }}>
              <PriceBadge price={props.price} delay={t.reveal + 20} size={230} />
            </div>
          ) : null}
        </div>
      </div>

      {/* Name reveal under the product */}
      <div
        style={{
          position: 'absolute',
          left: SAFE.side,
          right: SAFE.side,
          top: 1330,
          textAlign: 'center',
          opacity: nameIn,
          translate: `0px ${interpolate(nameIn, [0, 1], [30, 0])}px`,
        }}
      >
        <div
          style={{
            fontFamily: font.display,
            fontSize: autoSize(props.name, 128, 80, 12),
            lineHeight: 0.95,
            color: colors.onNight,
            textTransform: 'uppercase',
            textShadow: TEXT_SHADOW,
          }}
        >
          {props.name}
        </div>
        {props.subtitle ? (
          <div
            style={{
              marginTop: 18,
              fontFamily: font.body,
              fontWeight: 700,
              fontSize: 40,
              color: colors.highlight,
              letterSpacing: 2,
            }}
          >
            {props.subtitle}
          </div>
        ) : null}
      </div>

      <Sequence from={t.features} durationInFrames={t.cta - t.features} name="features">
        <AbsoluteFill style={{ opacity: pose(frame, [t.cta - 10, t.cta], [1, 0]) }}>
          <FeatureChips features={features} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={t.cta} name="cta">
        <TypedDomain kicker={props.ctaKicker} />
      </Sequence>

      <BrandOverlay />

      <Music file={props.music.file} volume={props.music.volume} />
      <Sfx file={sfx.boom} at={4} volume={0.8} master={sfx.volume} />
      {hook.split(/\s+/).map((_, i) => (
        <Sfx key={`w${i}`} file={sfx.tick} at={4 + i * 5} volume={0.35} master={sfx.volume} seconds={0.4} />
      ))}
      <Sfx file={sfx.riser} at={t.reveal - 20} volume={0.5} master={sfx.volume} />
      <Sfx file={sfx.whoosh} at={t.reveal - 4} volume={0.7} master={sfx.volume} />
      {props.showPrice ? <Sfx file={sfx.ding} at={t.reveal + 24} volume={0.6} master={sfx.volume} /> : null}
      {features.map((_, i) => (
        <Sfx key={`f${i}`} file={sfx.pop} at={t.features + 8 + i * 14} volume={0.5} master={sfx.volume} />
      ))}
      <DomainTypeSfx domain={url} from={t.cta} tick={sfx.tick} click={sfx.ding} master={sfx.volume} />
    </AbsoluteFill>
  );
};
