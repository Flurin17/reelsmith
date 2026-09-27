import { describe, expect, it } from 'vitest';
import { BRANDS, DEFAULT_BRAND } from '../brands';
import { brandReport } from '../cli/lib/brand';
import { featureLines } from '../cli/lib/builders';
import { describeTemplate } from '../cli/lib/describe';
import { estimateFrames, placeScenes } from '../src/core/scenes';
import { TEMPLATES } from '../src/templates';
import { domainCtaTiming, typedCount } from '../src/theme/primitives/DomainCta';
import { emphasisWords } from '../src/theme/primitives/Text';
import { resolveTheme } from '../src/theme/resolve';

describe('brands', () => {
  it('include the default brand', () => {
    expect(BRANDS[DEFAULT_BRAND]).toBeDefined();
  });

  it.each(Object.keys(BRANDS))('%s passes every contrast pair', (id) => {
    const { failures, lines } = brandReport(id);
    expect(failures, lines.filter((l) => l.includes('FAIL')).join('\n')).toBe(0);
  });

  it.each(Object.entries(BRANDS))('%s resolves with id matching its folder', (id, theme) => {
    const t = resolveTheme(theme);
    expect(t.id).toBe(id);
    expect(t.tones.length).toBeGreaterThan(0);
    expect(t.motion.ease).toHaveLength(4);
  });

  it('fills defaults for a minimal theme', () => {
    const t = resolveTheme({
      id: 'x',
      name: 'X',
      url: 'x.example',
      colors: {
        bg: '#fff',
        surface: '#fff',
        text: '#000',
        muted: '#333',
        line: '#ccc',
        primary: '#00f',
        onPrimary: '#fff',
        accent: '#f00',
        onAccent: '#fff',
      },
      fonts: { display: { family: 'Inter' }, body: { family: 'Inter' } },
    });
    expect(t.tones).toHaveLength(3);
    expect(t.gradient).toEqual(['#00f', '#f00']);
    expect(t.shape.radius).toBe(20);
    expect(t.text.label.case).toBe('upper');
  });
});

describe('emphasisWords', () => {
  it('keeps an emphasis span as one token with trailing punctuation', () => {
    expect(emphasisWords('Your lamp is *too bright*.')).toEqual([
      { word: 'Your', hot: false },
      { word: 'lamp', hot: false },
      { word: 'is', hot: false },
      { word: 'too bright.', hot: true },
    ]);
  });
});

describe('scene timing', () => {
  it('estimates duration from words, with a minimum', () => {
    expect(estimateFrames('', 30)).toBe(66);
    expect(estimateFrames('one two three four five six seven eight nine ten', 30)).toBe(
      Math.round((10 * 0.36 + 0.9) * 30),
    );
    expect(estimateFrames('[excited] one', 30)).toBe(66);
  });

  it('adds template extras (e.g. CTA holds) and flows scenes', () => {
    const placed = placeScenes(
      [
        { id: 'a', say: '', voiceover: '', duration: 60 },
        { id: 'b', say: '', voiceover: '', duration: 30 },
      ],
      30,
      { extra: (s) => (s.id === 'b' ? 10 : 0) },
    );
    expect(placed.map((s) => [s.from, s.duration])).toEqual([
      [0, 60],
      [60, 40],
    ]);
  });
});

describe('domain CTA timing', () => {
  it('finishes typing any domain in about two seconds', () => {
    for (const domain of ['a.io', 'lumen-home.example', 'https://a-very-long-domain-name-for-testing.example/']) {
      const t = domainCtaTiming(domain);
      expect(t.doneFrame).toBeLessThanOrEqual(8 + Math.max(60, t.text.length * 2));
      expect(typedCount(domain, t.doneFrame)).toBe(t.text.length);
    }
    expect(typedCount('example.com', 0)).toBe(0);
  });
});

describe('featureLines', () => {
  it('keeps up to three short clauses', () => {
    expect(
      featureLines(
        'Forty hours of battery, adaptive noise cancelling and memory-foam cushions that disappear on long days.',
      ),
    ).toEqual(['Forty hours of battery', 'Adaptive noise cancelling']);
  });
});

describe('describeTemplate', () => {
  it.each(TEMPLATES.map((t) => [t.id, t] as const))('%s prints a compact signature', (_, t) => {
    const text = describeTemplate(t);
    expect(text).toContain('props:');
    expect(text).toContain('example job:');
    expect(text).not.toContain('captions?: '); // internal field hidden
    expect(text.length).toBeLessThan(4000);
  });
});
