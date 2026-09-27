import { defineTheme } from '../../src/theme/types';

/** Kin — gentle skincare. Blush and sage, soft serif, slow and calm. */
export default defineTheme({
  id: 'kin',
  name: 'kin',
  url: 'kinskin.example',
  handle: '@kinskin',
  tagline: 'Fewer steps, better skin',
  locale: 'en-US',
  currency: 'USD',
  colors: {
    bg: '#f6e7e1',
    surface: '#fffaf7',
    text: '#3a2722',
    muted: '#735650',
    line: '#e6cfc6',
    primary: '#566649',
    onPrimary: '#fffaf7',
    accent: '#b05541',
    onAccent: '#fffaf7',
    sage: '#dce4d3',
    cream: '#f5efe2',
  },
  tones: [
    { bg: '#f6e7e1', text: '#3a2722', accent: '#b05541', onAccent: '#fffaf7', muted: '#735650' },
    { bg: '#dce4d3', text: '#2c3524', accent: '#566649', onAccent: '#fffaf7', muted: '#56614b' },
    { bg: '#f5efe2', text: '#3a2722', accent: '#566649', onAccent: '#fffaf7', muted: '#6b5c48' },
  ],
  gradient: ['#f1cdbf', '#e9e0c8', '#cfdcc4'],
  fonts: {
    display: { family: 'Instrument Serif', weights: ['400'], italic: true },
    body: { family: 'DM Sans', weights: ['400', '500', '700'] },
  },
  text: {
    display: { weight: 400, tracking: -0.02, lineHeight: 0.95 },
    title: { weight: 400, tracking: -0.01, lineHeight: 1 },
    body: { weight: 400, lineHeight: 1.35 },
    label: { weight: 500, tracking: 0.22 },
  },
  shape: { radius: 40, border: 0, shadow: 'soft' },
  motion: { ease: [0.33, 1, 0.68, 1], enter: 26, stagger: 6, reveal: 'fade', spring: { damping: 20, stiffness: 90 } },
  backdrop: { kind: 'mesh', grain: 0.05 },
});
