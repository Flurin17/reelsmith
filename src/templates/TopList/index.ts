import { defineTemplate } from '../../core/template';
import { TopList } from './Composition';
import { defaultTopListProps, topListProps, topListTiming, type TopListProps } from './schema';

export const topList = defineTemplate<TopListProps>({
  id: 'TopList',
  description:
    'Bold flat-color "Top N" countdown from catalog products: ticker intro, giant outlined ranks, sticker prices, typed-domain CTA.',
  component: TopList,
  schema: topListProps,
  defaultProps: defaultTopListProps,
  durationInFrames: topListTiming(defaultTopListProps).total,
  calculateMetadata: ({ props }) => ({ durationInFrames: topListTiming(props).total }),
  stills: (props) => {
    const t = topListTiming(props);
    return [
      Math.round(t.intro * 0.6),
      ...props.items.map((_, i) => t.intro + i * t.item + Math.round(t.item * 0.7)),
      t.total - 20,
    ];
  },
});
