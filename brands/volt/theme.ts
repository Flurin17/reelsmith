import { defineTheme } from '../../src/theme/types';

/** VOLT — energy drinks. Loud, brutalist, acid on black. */
export default defineTheme({
  id: 'volt',
  name: 'VOLT',
  url: 'drinkvolt.example',
  handle: '@drinkvolt',
  tagline: 'Zero sugar. Full send.',
  locale: 'en-US',
  currency: 'USD',
  colors: {
    bg: '#0c0c0c',
    surface: '#1a1a1a',
    text: '#f2f2ea',
    muted: '#a3a39a',
    line: '#f2f2ea',
    primary: '#c8ff00',
    onPrimary: '#0c0c0c',
    accent: '#ff2e6e',
    onAccent: '#0c0c0c',
  },
  tones: [
    { bg: '#0c0c0c', text: '#f2f2ea', accent: '#c8ff00', onAccent: '#0c0c0c', muted: '#a3a39a' },
    { bg: '#c8ff00', text: '#0c0c0c', accent: '#0c0c0c', onAccent: '#c8ff00', muted: '#3a4a00' },
    { bg: '#ff2e6e', text: '#0c0c0c', accent: '#0c0c0c', onAccent: '#ff2e6e', muted: '#5a0f27' },
  ],
  gradient: ['#c8ff00', '#ff2e6e'],
  fonts: {
    display: { family: 'Anton', weights: ['400'] },
    body: { family: 'Archivo', weights: ['500', '800', '900'] },
  },
  text: {
    display: { weight: 400, case: 'upper', tracking: 0, lineHeight: 0.86 },
    title: { weight: 400, case: 'upper', tracking: 0.01, lineHeight: 0.9 },
    body: { weight: 800, lineHeight: 1.15 },
    label: { weight: 900, tracking: 0.06 },
  },
  shape: { radius: 0, border: 5, shadow: 'hard' },
  motion: { ease: [0.85, 0, 0.15, 1], enter: 10, stagger: 3, reveal: 'slide', spring: { damping: 9, stiffness: 260 } },
  backdrop: { kind: 'rays', grain: 0 },
});
