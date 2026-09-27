import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const skills = readdirSync(join(root, 'skills'));
const cli = readFileSync(join(root, 'cli/index.ts'), 'utf8');
const commands = new Set([...cli.matchAll(/case '([a-z-]+)':/g)].map((m) => m[1]));

/** Minimal frontmatter parser (name/description on one line each). */
function frontmatter(md: string): Record<string, string> {
  const block = md.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';
  return Object.fromEntries(block.split('\n').map((l) => l.split(/:\s(.*)/s).slice(0, 2) as [string, string]));
}

describe.each(skills)('skill %s', (dir) => {
  const md = readFileSync(join(root, 'skills', dir, 'SKILL.md'), 'utf8');
  const meta = frontmatter(md);

  it('follows the Agent Skills format', () => {
    expect(meta.name).toBe(dir);
    expect(meta.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(meta.name.length).toBeLessThanOrEqual(64);
    expect(meta.description.length).toBeGreaterThan(40);
    expect(meta.description.length).toBeLessThanOrEqual(1024);
  });

  it('only references CLI commands that exist', () => {
    const used = [...md.matchAll(/pnpm reelsmith ([a-z-]+)/g)].map((m) => m[1]);
    for (const cmd of used) expect(commands, `unknown command "${cmd}"`).toContain(cmd);
  });

  it('does not depend on one agent’s tool names', () => {
    expect(md).not.toMatch(/\b(Read|Bash|Edit|Write|Glob|Grep) tool\b/);
  });
});
