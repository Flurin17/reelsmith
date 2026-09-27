import { defineTheme } from '../../src/theme/types';

/** Nocturne Audio — premium headphones. Dark, quiet, champagne glow. */
export default defineTheme({
  id: 'nocturne',
  name: 'Nocturne',
  url: 'nocturne-audio.example',
  handle: '@nocturneaudio',
  tagline: 'Sound, after dark',
  locale: 'en-US',
  currency: 'USD',
  colors: {
    bg: '#07070a',
    surface: '#15141b',
    text: '#f4f1ea',
    muted: '#a39d92',
    line: '#2b2a33',
    primary: '#d8b27a',
    onPrimary: '#0b0a0e',
    accent: '#ff6a3d',
    onAccent: '#0b0a0e',
  },
  tones: [
    { bg: '#07070a', text: '#f4f1ea', accent: '#d8b27a', onAccent: '#0b0a0e', muted: '#a39d92' },
    { bg: '#120e0a', text: '#f4f1ea', accent: '#ff6a3d', onAccent: '#0b0a0e', muted: '#b4a898' },
  ],
  gradient: ['#d8b27a', '#ff6a3d', '#3a2d7a'],
  fonts: {
    display: { family: 'Unbounded', weights: ['500', '700'] },
    body: { family: 'Inter', weights: ['400', '500', '700'] },
  },
  text: {
    display: { weight: 700, tracking: -0.04, lineHeight: 0.98 },
    title: { weight: 500, tracking: -0.02 },
    label: { weight: 500, tracking: 0.32 },
  },
  shape: { radius: 28, border: 1, shadow: 'glow' },
  motion: { ease: [0.22, 1, 0.36, 1], enter: 22, stagger: 5, reveal: 'blur', spring: { damping: 18, stiffness: 120 } },
  backdrop: { kind: 'spotlight', grain: 0.07 },
});
