/**
 * Renders frames in headless Chrome (slow). Enabled in CI and with
 * REELSMITH_RENDER_TESTS=1 locally.
 */
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadJob } from '../cli/lib/jobs';
import { reviewJob } from '../cli/lib/review';

const enabled = process.env.REELSMITH_RENDER_TESTS === '1' || process.env.CI === 'true';

describe.skipIf(!enabled)('reelsmith review (render)', () => {
  it('catches seeded problems in a bad job', async () => {
    // Loading validates the schema; the image file is missing on purpose.
    const job = loadJob(join(__dirname, 'fixtures/bad-explainer.json'));
    const r = await reviewJob(job, { frames: [15, 60] });
    const rules = new Set(r.findings.map((f) => f.rule));
    expect(rules).toContain('asset-missing');
    expect(rules).toContain('speech-cut-off');
    expect(rules).toContain('reading-speed');
    expect(rules).toContain('scene-too-short');
    expect(r.passed).toBe(false);
  }, 240_000);

  it('passes the shipped examples', async () => {
    for (const file of ['kin-routine', 'lumen-explainer', 'nocturne-spotlight', 'orbit-app', 'volt-top-5']) {
      const r = await reviewJob(loadJob(join(__dirname, `../examples/jobs/${file}.json`)));
      expect({ file, errors: r.findings.filter((f) => f.severity === 'error') }).toEqual({ file, errors: [] });
      expect(r.passed).toBe(true);
    }
  }, 600_000);
});
