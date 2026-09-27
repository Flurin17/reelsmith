import config from '../../../reelsmith.config';
import { audioDurationSeconds } from '../../core/media';
import { VIDEO, defineTemplate } from '../../core/template';
import { layoutScenes, timelineLength, withVoiceoverDurations } from '../../core/timeline';
import { Explainer } from './Composition';
import { defaultExplainerProps, explainerProps, type ExplainerProps } from './schema';

export const explainer = defineTemplate<ExplainerProps>({
  id: 'Explainer',
  description:
    'Light editorial narrated explainer: one idea per scene (versus / bullets / stat / image), synced captions, typed-domain CTA. Length follows the voiceover.',
  component: Explainer,
  schema: explainerProps,
  defaultProps: defaultExplainerProps,
  durationInFrames: timelineLength(
    layoutScenes(defaultExplainerProps.scenes, defaultExplainerProps.defaultSceneSeconds * VIDEO.fps),
  ),
  calculateMetadata: async ({ props }) => {
    const scenes = await withVoiceoverDurations(
      props.scenes,
      VIDEO.fps,
      audioDurationSeconds,
      config.voice?.tailPadding,
    );
    const placed = layoutScenes(scenes, Math.round(props.defaultSceneSeconds * VIDEO.fps));
    return { durationInFrames: timelineLength(placed), props: { ...props, scenes } };
  },
  stills: (props) =>
    layoutScenes(props.scenes, Math.round(props.defaultSceneSeconds * VIDEO.fps)).map(
      (s) => s.from + Math.min(Math.round(s.duration * 0.6), Math.max(0, s.duration - 12)),
    ),
});
