import config from '../../../reelsmith.config';
import { audioDurationSeconds } from '../../core/media';
import { VIDEO, defineTemplate } from '../../core/template';
import { timelineLength, withVoiceoverDurations } from '../../core/timeline';
import { KineticCaptions } from './Composition';
import { defaultKineticCaptionsProps, kineticCaptionsProps, placeKinetic, type KineticCaptionsProps } from './schema';

const place = (props: KineticCaptionsProps) => placeKinetic(props, VIDEO.fps);

export const kineticCaptions = defineTemplate<KineticCaptionsProps>({
  id: 'KineticCaptions',
  description:
    'Faceless narrated reel: giant words pop exactly as spoken on flat brand-color scenes, emphasis highlights, product stickers, typed CTA. Works silent (even timing) before voiceover.',
  component: KineticCaptions,
  schema: kineticCaptionsProps,
  defaultProps: defaultKineticCaptionsProps,
  durationInFrames: timelineLength(place(defaultKineticCaptionsProps)),
  calculateMetadata: async ({ props }) => {
    const scenes = await withVoiceoverDurations(
      props.scenes,
      VIDEO.fps,
      audioDurationSeconds,
      config.voice?.tailPadding,
    );
    const next = { ...props, scenes };
    return { durationInFrames: timelineLength(place(next)), props: next };
  },
  stills: (props) => place(props).map((s) => s.from + Math.round(s.duration * (s.cta ? 0.9 : 0.55))),
});
