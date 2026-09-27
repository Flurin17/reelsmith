import { describe, expect, it } from 'vitest';
import { lintTemplateSource, scoreFindings, type Finding } from '../cli/lib/review';
import { contrastRatio } from '../src/core/audit';

const f = (severity: Finding['severity'], rule = 'r'): Finding => ({ rule, severity, message: '', fix: '' });

describe('scoreFindings', () => {
  it('passes a clean job', () => {
    expect(scoreFindings([])).toEqual({ score: 100, counts: { error: 0, warn: 0, info: 0 }, passed: true });
  });

  it('fails on any error even with a high score', () => {
    const r = scoreFindings([f('error')]);
    expect(r.score).toBe(85);
    expect(r.passed).toBe(false);
  });

  it('caps each rule at three penalised hits', () => {
    const many = Array.from({ length: 10 }, () => f('warn', 'same'));
    expect(scoreFindings(many).score).toBe(85);
    expect(scoreFindings(many).counts.warn).toBe(10);
  });

  it('ignores info for the score', () => {
    expect(scoreFindings([f('info'), f('info')]).score).toBe(100);
  });
});

describe('lintTemplateSource', () => {
  it('flags literal colors and fonts', () => {
    const src = [
      "const a = { color: '#ff0000' };",
      "const b = { background: 'rgba(12, 200, 3, 0.4)' };",
      "const c = { fontFamily: 'Inter' };",
    ].join('\n');
    expect(lintTemplateSource(src).map((h) => h.line)).toEqual([1, 2, 3]);
  });

  it('allows brand tokens, neutral shadows and comments', () => {
    const src = [
      'const a = { color: colors.primary, fontFamily: font.display };',
      "const s = { boxShadow: '0 10px 30px rgba(0,0,0,0.5)' };",
      '// e.g. #ff0000 in a comment',
      '/* rgba(1,2,3,1) */',
    ].join('\n');
    expect(lintTemplateSource(src)).toEqual([]);
  });
});

describe('contrastRatio', () => {
  it('matches WCAG reference values', () => {
    expect(contrastRatio([0, 0, 0, 1], [255, 255, 255, 1])).toBeCloseTo(21, 0);
    expect(contrastRatio([119, 119, 119, 1], [255, 255, 255, 1])).toBeCloseTo(4.48, 1);
  });
});
