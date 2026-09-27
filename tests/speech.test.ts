import { describe, expect, it } from 'vitest';
import { speechBounds } from '../cli/lib/speech';

const SR = 16000;

/** silence(0.3s) + 440 Hz tone(1s) + silence(0.7s) with a little noise. */
function clip(): Int16Array {
  const total = Math.round(2 * SR);
  const pcm = new Int16Array(total);
  let seed = 1;
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 60;
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    const tone = t >= 0.3 && t < 1.3 ? Math.sin(2 * Math.PI * 440 * t) * 12000 : 0;
    pcm[i] = Math.round(tone + noise());
  }
  return pcm;
}

describe('speechBounds', () => {
  it('finds where sound starts and ends', () => {
    const b = speechBounds(clip(), SR);
    expect(b.duration).toBeCloseTo(2, 2);
    expect(b.speechStart).toBeGreaterThan(0.27);
    expect(b.speechStart).toBeLessThan(0.33);
    expect(b.speechEnd).toBeGreaterThan(1.27);
    expect(b.speechEnd).toBeLessThan(1.35);
  });
});
