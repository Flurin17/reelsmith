import { defineTemplate } from '../../core/template';
import { ProductSpotlight } from './Composition';
import {
  defaultProductSpotlightProps,
  productSpotlightProps,
  spotlightTiming,
  type ProductSpotlightProps,
} from './schema';

export const productSpotlight = defineTemplate<ProductSpotlightProps>({
  id: 'ProductSpotlight',
  description:
    'Dark cinematic single-product ad on one continuous stage: kinetic hook → product rises into a spotlight with price → feature chips → typed-domain CTA (~14s).',
  component: ProductSpotlight,
  schema: productSpotlightProps,
  defaultProps: defaultProductSpotlightProps,
  durationInFrames: spotlightTiming(defaultProductSpotlightProps.seconds).total,
  calculateMetadata: ({ props }) => ({ durationInFrames: spotlightTiming(props.seconds).total }),
  stills: (props) => {
    const t = spotlightTiming(props.seconds);
    return [30, t.reveal + 45, t.features + 60, t.total - 15];
  },
});
