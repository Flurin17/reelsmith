import { defineTheme } from '../../src/theme/types';

/** Lumen — considered objects for the home. Warm paper, serif, editorial. */
export default defineTheme({
  id: 'lumen',
  name: 'Lumen',
  url: 'lumen-home.example',
  handle: '@lumenhome',
  tagline: 'Objects for slow evenings',
  locale: 'en-US',
  currency: 'USD',
  colors: {
    bg: '#f3ede3',
    surface: '#fffaf2',
    text: '#1f1b16',
    muted: '#6d6356',
    line: '#d9cebd',
    primary: '#a94a24',
    onPrimary: '#fffaf2',
    accent: '#e8b64a',
    onAccent: '#1f1b16',
    olive: '#4f5a3a',
  },
  tones: [
    { bg: '#f3ede3', text: '#1f1b16', accent: '#a94a24', onAccent: '#fffaf2', muted: '#6d6356' },
    { bg: '#a94a24', text: '#fffaf2', accent: '#f3cf7a', onAccent: '#1f1b16', muted: '#f2d7c7' },
    { bg: '#4f5a3a', text: '#fffaf2', accent: '#e8b64a', onAccent: '#1f1b16', muted: '#dfe3cf' },
  ],
  gradient: ['#e8b64a', '#a94a24', '#f3ede3'],
  fonts: {
    display: { family: 'Fraunces', weights: ['500', '700'], italic: true },
    body: { family: 'Inter', weights: ['400', '500', '600'] },
  },
  text: {
    display: { weight: 500, tracking: -0.035, lineHeight: 0.96 },
    title: { weight: 500, tracking: -0.02, lineHeight: 1.02 },
    body: { weight: 400, lineHeight: 1.35 },
    label: { weight: 600, tracking: 0.2 },
  },
  shape: { radius: 6, border: 1, shadow: 'soft' },
  motion: { ease: [0.25, 1, 0.5, 1], enter: 20, stagger: 5, reveal: 'mask' },
  backdrop: { kind: 'grid', grain: 0.05 },
});
