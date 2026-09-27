import { describe, expect, it } from 'vitest';
import { alignmentToWords, groupPhrases, stripAudioTags } from '../src/core/captions';

/** Build a fake alignment: every character takes 0.05s. */
function align(text: string) {
  const characters = [...text];
  return {
    characters,
    characterStartTimesSeconds: characters.map((_, i) => i * 0.05),
    characterEndTimesSeconds: characters.map((_, i) => (i + 1) * 0.05),
  };
}

describe('alignmentToWords', () => {
  it('turns characters into timed words', () => {
    const words = alignmentToWords(align('Hi there'));
    expect(words).toEqual([
      { text: 'Hi', start: 0, end: 0.1, speaker: '' },
      { text: 'there', start: 0.15, end: 0.4, speaker: '' },
    ]);
  });

  it('drops expressive audio tags', () => {
    const words = alignmentToWords(align('[excited] Big news!'));
    expect(words.map((w) => w.text)).toEqual(['Big', 'news!']);
  });

  it('assigns speakers from character indexes', () => {
    const words = alignmentToWords(align('Yes? No.'), (i) => (i < 4 ? 'a' : 'b'));
    expect(words.map((w) => [w.text, w.speaker])).toEqual([
      ['Yes?', 'a'],
      ['No.', 'b'],
    ]);
  });
});

describe('groupPhrases', () => {
  const w = (text: string, start: number, speaker = '') => ({ text, start, end: start + 0.2, speaker });

  it('breaks on word count, punctuation, pauses and speaker changes', () => {
    const phrases = groupPhrases(
      [
        w('one', 0),
        w('two', 0.25),
        w('three', 0.5),
        w('four', 0.75),
        w('five.', 1),
        w('six', 1.25),
        w('seven', 2.5),
        w('eight', 2.75, 'b'),
      ],
      3,
    );
    expect(phrases.map((p) => p.map((x) => x.text).join(' '))).toEqual([
      'one two three',
      'four five.',
      'six',
      'seven',
      'eight',
    ]);
  });
});

describe('stripAudioTags', () => {
  it('removes tags and collapses whitespace', () => {
    expect(stripAudioTags('[warmly]  Hello [short pause] there')).toBe('Hello there');
  });
});
