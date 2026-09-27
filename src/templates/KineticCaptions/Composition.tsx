import React from 'react';
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useBrand, type BrandKit } from '../../brand/context';
import { domainCtaTiming, DomainTypeSfx, typedCount } from '../../components/DomainTypeCta';
import { ProductImage } from '../../components/ProductImage';
import { Music, Sfx, Voiceover } from '../../components/Sfx';
import { groupPhrases, type CaptionWord } from '../../core/captions';
import { SAFE } from '../../core/template';
import type { Placed } from '../../core/timeline';
import {
  CTA_HOLD_SECONDS,
  evenCaptions,
  isEmphasis,
  placeKinetic,
  type KineticCaptionsProps,
  type KineticScene,
} from './schema';

type Tone = KineticScene['tone'];

/** Background, text and highlight colors per tone (all brand tokens). */
function palette(b: BrandKit, tone: Tone) {
  const c = b.colors;
  switch (tone) {
    case 'primary':
      return { bg: c.primary, fg: c.onPrimary, hot: c.secondary, hotFg: c.onSecondary };
    case 'secondary':
      return { bg: c.secondary, fg: c.onSecondary, hot: c.primary, hotFg: c.onPrimary };
    case 'paper':
      return { bg: c.paper, fg: c.ink, hot: c.primary, hotFg: c.onPrimary };
    default:
      return { bg: c.ink, fg: c.surface, hot: c.secondary, hotFg: c.onSecondary };
  }
}

/** The phrase being spoken, one big word per line; the spoken word pops. */
const Words: React.FC<{ words: CaptionWord[]; emphasis: string[]; tone: Tone; perPhrase: number; top: number }> = ({
  words,
  emphasis,
  tone,
  perPhrase,
  top,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const p = palette(brand, tone);
  const t = frame / fps;
  const phrases = groupPhrases(words, perPhrase);
  const phrase = phrases.findLast((ph) => t >= ph[0].start - 0.08) ?? phrases[0];
  if (!phrase) return null;
  const longest = Math.max(...phrase.map((w) => w.text.length));
  const size = Math.max(110, Math.min(250, Math.floor(1560 / Math.max(longest, 4))));

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE.side,
        right: SAFE.side,
        top,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 6,
      }}
    >
      {phrase.map((w, i) => {
        const start = Math.round(w.start * fps);
        const pop = spring({ frame: frame - start + 2, fps, config: { damping: 13, stiffness: 220 } });
        const spoken = t >= w.start - 0.05;
        const hot = isEmphasis(w.text, emphasis);
        return (
          <div
            key={`${w.start}-${i}`}
            style={{
              fontFamily: brand.font.display,
              fontSize: size,
              lineHeight: 0.92,
              textTransform: 'uppercase',
              padding: hot ? '6px 22px 0' : '0',
              color: hot ? p.hotFg : p.fg,
              background: hot ? p.hot : 'transparent',
              opacity: spoken ? 1 : 0.18,
              scale: spoken ? interpolate(pop, [0, 1], [1.25, 1]) : 1,
              rotate: hot ? `${i % 2 ? 2 : -2}deg` : '0deg',
              transformOrigin: 'left center',
            }}
          >
            {w.text}
          </div>
        );
      })}
    </div>
  );
};

const Scene: React.FC<{
  scene: Placed<KineticScene>;
  words: CaptionWord[];
  perPhrase: number;
  index: number;
  total: number;
}> = ({ scene, words, perPhrase, index, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const p = palette(brand, scene.tone);
  const wipe = interpolate(frame, [0, 10], [0, 100], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const sticker = spring({ frame: frame - 6, fps, config: { damping: 11, stiffness: 120 } });
  const ctaAt = scene.cta ? Math.max(10, Math.round((words.at(-1)?.end ?? 1) * fps) + 4) : 0;
  const typed = scene.cta ? typedCount(brand.url, frame - ctaAt) : 0;
  const ctaIn = scene.cta ? spring({ frame: frame - ctaAt, fps, config: { damping: 14 } }) : 0;
  const { text } = domainCtaTiming(brand.url);

  return (
    <AbsoluteFill style={{ background: p.bg, clipPath: `circle(${wipe * 1.5}% at ${index % 2 ? 90 : 10}% 20%)` }}>
      {/* Progress: one segment per scene */}
      <div style={{ position: 'absolute', top: 236, left: SAFE.side, right: SAFE.side, display: 'flex', gap: 10 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 10, background: p.fg, opacity: i <= index ? 0.9 : 0.2 }} />
        ))}
      </div>

      {/* Wordmark in the scene's text color keeps contrast on every tone */}
      <div
        style={{
          position: 'absolute',
          top: 150,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: brand.font.display,
          fontSize: 52,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: p.fg,
        }}
      >
        {brand.name}
      </div>

      {scene.image ? (
        <div
          style={{
            position: 'absolute',
            right: SAFE.side - 10,
            top: 1240,
            width: 360,
            height: 380,
            borderRadius: '50%',
            background: brand.colors.surface,
            border: `8px solid ${brand.colors.ink}`,
            boxShadow: `16px 16px 0 ${brand.colors.ink}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            scale: sticker,
            rotate: `${interpolate(sticker, [0, 1], [-40, 8])}deg`,
          }}
        >
          <ProductImage image={scene.image} label="" maxWidth={250} maxHeight={250} />
        </div>
      ) : null}

      <Words
        words={words}
        emphasis={scene.emphasis}
        tone={scene.tone}
        perPhrase={perPhrase}
        top={scene.cta ? 440 : 600}
      />

      {scene.cta ? (
        <div
          style={{
            position: 'absolute',
            left: SAFE.side,
            right: SAFE.side,
            top: 1180,
            display: 'flex',
            justifyContent: 'center',
            opacity: ctaIn,
            translate: `0px ${interpolate(ctaIn, [0, 1], [60, 0])}px`,
          }}
        >
          <div
            style={{
              padding: '26px 46px',
              borderRadius: 999,
              background: p.hot,
              color: p.hotFg,
              border: `6px solid ${p.fg}`,
              fontFamily: brand.font.display,
              fontSize: Math.min(84, Math.floor(1500 / Math.max(text.length, 10))),
              whiteSpace: 'nowrap',
            }}
          >
            {text.slice(0, typed)}
            <span style={{ opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0 }}>|</span>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * Faceless narrated reel: huge words appear exactly as they are spoken, each
 * scene on its own flat brand color, optional product stickers, typed CTA.
 */
export const KineticCaptions: React.FC<KineticCaptionsProps> = (props) => {
  const { fps } = useVideoConfig();
  const { url } = useBrand();
  const scenes = placeKinetic(props, fps);
  const { sfx } = props;

  return (
    <AbsoluteFill>
      {scenes.map((scene, i) => {
        const words = scene.captions.length
          ? scene.captions
          : evenCaptions(scene.voiceoverText, (scene.duration - (scene.cta ? CTA_HOLD_SECONDS * fps : 0)) / fps);
        const ctaAt = scene.cta ? Math.max(10, Math.round((words.at(-1)?.end ?? 1) * fps) + 4) : 0;
        return (
          <React.Fragment key={scene.id}>
            <Sequence
              from={scene.from}
              durationInFrames={i === scenes.length - 1 ? scene.duration : scene.duration + 10}
              name={scene.id}
            >
              <Scene scene={scene} words={words} perPhrase={props.wordsPerPhrase} index={i} total={scenes.length} />
            </Sequence>
            <Voiceover file={scene.voiceover} from={scene.from} duration={scene.duration} />
            <Sfx
              file={i === 0 ? sfx.hit : sfx.whoosh}
              at={scene.from}
              volume={i === 0 ? 0.8 : 0.5}
              master={sfx.volume}
            />
            {scene.image ? <Sfx file={sfx.pop} at={scene.from + 8} volume={0.5} master={sfx.volume} /> : null}
            {scene.cta ? (
              <DomainTypeSfx
                domain={url}
                from={scene.from + ctaAt}
                tick={sfx.tick}
                click={sfx.ding}
                master={sfx.volume}
              />
            ) : null}
          </React.Fragment>
        );
      })}
      <Music file={props.music.file} volume={props.music.volume} />
    </AbsoluteFill>
  );
};
