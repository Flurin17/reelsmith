import React from 'react';
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { useBrand } from '../../brand/context';
import { AccentDivider, BrandOverlay, Kicker } from '../../components/BrandMarks';
import { Captions } from '../../components/Captions';
import { DomainTypeCta, DomainTypeSfx } from '../../components/DomainTypeCta';
import { PaperBackdrop } from '../../components/PaperBackdrop';
import { ParticleOverlay } from '../../components/ParticleOverlay';
import { Music, Sfx, Voiceover } from '../../components/Sfx';
import { SAFE, VIDEO } from '../../core/template';
import { layoutScenes, type Placed } from '../../core/timeline';
import type { ExplainerProps, ExplainerScene } from './schema';
import { Visual } from './visuals';

const SceneCard: React.FC<{ scene: Placed<ExplainerScene>; withCaptions: boolean }> = ({ scene, withCaptions }) => {
  const local = useCurrentFrame();
  const { colors, font, url } = useBrand();
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
  const enter = interpolate(local, [0, 16], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const exit = interpolate(local, [scene.duration - 14, scene.duration], [1, 0], clamp);

  if (scene.visual.type === 'cta') {
    return (
      <DomainTypeCta
        domain={url}
        kicker={scene.kicker}
        button={scene.visual.button}
        durationInFrames={scene.duration}
      />
    );
  }

  return (
    <AbsoluteFill
      style={{
        opacity: enter * exit,
        padding: `${SAFE.top + 70}px ${SAFE.side}px ${withCaptions ? 520 : SAFE.bottom}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 40,
        translate: `0px ${interpolate(enter, [0, 1], [34, 0])}px`,
      }}
    >
      <div style={{ width: '100%', textAlign: 'center' }}>
        {scene.kicker ? <Kicker>{scene.kicker}</Kicker> : null}
        {scene.headline ? (
          <div
            style={{
              marginTop: 24,
              fontFamily: font.display,
              fontSize: scene.headline.length > 26 ? 86 : 108,
              lineHeight: 0.98,
              color: colors.ink,
              textTransform: 'uppercase',
            }}
          >
            {scene.headline}
          </div>
        ) : null}
        {scene.body ? (
          <div
            style={{
              margin: '22px auto 0',
              maxWidth: 860,
              fontFamily: font.body,
              fontWeight: 800,
              fontSize: 40,
              lineHeight: 1.18,
              color: colors.inkMuted,
            }}
          >
            {scene.body}
          </div>
        ) : null}
        <AccentDivider />
      </div>
      <Visual visual={scene.visual} local={local} />
    </AbsoluteFill>
  );
};

/**
 * Narrated explainer: one idea per scene (kicker, headline, visual), per-scene
 * voiceover with synced captions, ending on a typed-domain CTA. Scene lengths
 * follow the voiceover automatically.
 */
export const Explainer: React.FC<ExplainerProps> = (props) => {
  const { colors, url, alpha } = useBrand();
  const scenes = layoutScenes<ExplainerScene>(props.scenes, Math.round(props.defaultSceneSeconds * VIDEO.fps));
  const { sfx } = props;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.paper }}>
      <PaperBackdrop />
      <ParticleOverlay count={28} seed={`explainer-${props.topic}`} color={alpha(colors.primary, 0.38)} />

      {scenes.map((scene) => {
        const withCaptions = props.showCaptions && scene.captions.length > 0 && scene.visual.type !== 'cta';
        return (
          <Sequence key={scene.id} from={scene.from} durationInFrames={scene.duration} name={scene.id}>
            <SceneCard scene={scene} withCaptions={withCaptions} />
            {withCaptions ? <Captions words={scene.captions} bottom={350} /> : null}
          </Sequence>
        );
      })}

      <BrandOverlay tone="dark" />

      {scenes.map((scene) => (
        <Voiceover key={`vo-${scene.id}`} file={scene.voiceover} from={scene.from} duration={scene.duration} />
      ))}
      <Music file={props.music.file} volume={props.music.volume} />

      {scenes.map((scene, i) =>
        scene.visual.type === 'cta' ? (
          <DomainTypeSfx
            key={`sfx-${scene.id}`}
            domain={url}
            from={scene.from}
            tick={sfx.tick}
            click={sfx.pop}
            master={sfx.volume}
          />
        ) : (
          <React.Fragment key={`sfx-${scene.id}`}>
            <Sfx
              file={i === 0 ? sfx.hit : sfx.swipe}
              at={scene.from}
              volume={i === 0 ? 0.85 : 0.42}
              master={sfx.volume}
            />
            <Sfx file={sfx.tick} at={scene.from + 14} volume={0.3} master={sfx.volume} />
          </React.Fragment>
        ),
      )}
    </AbsoluteFill>
  );
};
