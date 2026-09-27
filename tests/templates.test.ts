import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadJob } from '../cli/lib/jobs';
import { TEMPLATES } from '../src/templates';

describe('templates', () => {
  it('have unique PascalCase ids', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[A-Z][A-Za-z0-9]+$/);
  });

  it.each(TEMPLATES.map((t) => [t.id, t] as const))('%s default props satisfy its schema', (_, t) => {
    expect(t.schema.safeParse(t.defaultProps).success).toBe(true);
    expect(t.durationInFrames).toBeGreaterThan(0);
  });

  it('accept a per-video brand override', () => {
    for (const t of TEMPLATES) {
      const parsed = t.schema.safeParse({
        ...t.defaultProps,
        brand: { name: 'Other', colors: { primary: '#123456' } },
      });
      expect(parsed.success).toBe(true);
    }
  });
});

describe('example jobs', () => {
  const dir = join(__dirname, '../examples/jobs');
  it.each(readdirSync(dir).filter((f) => f.endsWith('.json')))('%s is valid', (file) => {
    expect(() => loadJob(join(dir, file))).not.toThrow();
  });
});
