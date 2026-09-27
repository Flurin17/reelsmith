import { defineTheme } from '../../src/theme/types';

/** Orbit — a money app for freelancers. Deep indigo, electric gradients, glass. */
export default defineTheme({
  id: 'orbit',
  name: 'Orbit',
  url: 'orbit-money.example',
  handle: '@orbitmoney',
  tagline: 'Money that keeps up with you',
  locale: 'en-US',
  currency: 'USD',
  colors: {
    bg: '#0b0a22',
    surface: '#18163d',
    text: '#f4f3ff',
    muted: '#a9a5d8',
    line: '#302c6b',
    primary: '#6d53ff',
    onPrimary: '#ffffff',
    accent: '#39f2c4',
    onAccent: '#0b0a22',
    pink: '#ff6ad5',
  },
  tones: [
    { bg: '#0b0a22', text: '#f4f3ff', accent: '#39f2c4', onAccent: '#0b0a22', muted: '#a9a5d8' },
    { bg: '#1b1150', text: '#f4f3ff', accent: '#ff6ad5', onAccent: '#0b0a22', muted: '#b9b1ee' },
  ],
  gradient: ['#6d53ff', '#39f2c4', '#ff6ad5'],
  fonts: {
    display: { family: 'Plus Jakarta Sans', weights: ['500', '700', '800'] },
    body: { family: 'Plus Jakarta Sans', weights: ['500', '700', '800'] },
  },
  text: {
    display: { weight: 800, tracking: -0.045, lineHeight: 0.98 },
    title: { weight: 700, tracking: -0.03, lineHeight: 1.05 },
    body: { weight: 500, lineHeight: 1.35 },
    label: { weight: 700, tracking: 0.14 },
  },
  shape: { radius: 32, border: 1, shadow: 'glow' },
  motion: { ease: [0.2, 0.9, 0.1, 1], enter: 18, stagger: 4, reveal: 'rise', spring: { damping: 15, stiffness: 170 } },
  backdrop: { kind: 'mesh', grain: 0.06 },
});
