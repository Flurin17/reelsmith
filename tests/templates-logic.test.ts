import { describe, expect, it } from 'vitest';
import { featureLines } from '../cli/lib/builders';
import { domainCtaTiming, typedCount } from '../src/components/DomainTypeCta';
import { evenCaptions, isEmphasis, placeKinetic, CTA_HOLD_SECONDS } from '../src/templates/KineticCaptions/schema';

describe('domain CTA timing', () => {
  it('finishes typing any domain in about two seconds', () => {
    for (const domain of ['a.io', 'lumen-supply.example', 'https://a-very-long-domain-name-for-testing.example/']) {
      const t = domainCtaTiming(domain);
      expect(t.doneFrame).toBeLessThanOrEqual(8 + Math.max(60, t.text.length * 2));
      expect(typedCount(domain, t.doneFrame)).toBe(t.text.length);
    }
  });

  it('types nothing before the start', () => {
    expect(typedCount('example.com', 0)).toBe(0);
  });
});

describe('KineticCaptions helpers', () => {
  it('spreads words evenly and drops audio tags', () => {
    const words = evenCaptions('[excited] One two three', 3);
    expect(words.map((w) => w.text)).toEqual(['One', 'two', 'three']);
    expect(words[1].start).toBeGreaterThan(words[0].end - 0.001);
    expect(words.at(-1)!.end).toBeLessThan(3);
  });

  it('matches emphasis ignoring case and punctuation', () => {
    expect(isEmphasis('ONE.', ['one'])).toBe(true);
    expect(isEmphasis('two', ['one'])).toBe(false);
  });

  it('adds a hold to CTA scenes', () => {
    const placed = placeKinetic({ secondsPerWord: 0.5, scenes: [{ id: 'a', duration: 60, cta: true } as never] }, 30);
    expect(placed[0].duration).toBe(60 + Math.round(CTA_HOLD_SECONDS * 30));
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
