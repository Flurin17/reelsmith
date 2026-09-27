/**
 * Job files: the unit an agent (or a human) writes to describe one video.
 *
 *   { "template": "Explainer", "props": { ... } }
 *
 * The file name (without .json) is the job slug; it names the output video
 * and the voiceover folder. Props are validated against the template schema.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { z } from 'zod';
import type { Template } from '../../src/core/template';
import { TEMPLATES } from '../../src/templates';
import { JOBS, ROOT } from './env';

export interface Job {
  template: string;
  props: Record<string, unknown>;
}

export interface LoadedJob extends Job {
  path: string;
  slug: string;
}

export function getTemplate(id: string): Template<any> {
  const template = TEMPLATES.find((t) => t.id === id);
  if (!template) {
    throw new Error(`Unknown template "${id}". Available: ${TEMPLATES.map((t) => t.id).join(', ')}`);
  }
  return template;
}

/** Format zod issues as "props.scenes.2.headline: expected string". */
export function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `  - props.${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
}

export function resolveJobPath(file: string): string {
  const candidates = [
    resolve(process.cwd(), file),
    resolve(ROOT, file),
    resolve(JOBS, file),
    resolve(JOBS, `${file}.json`),
  ];
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error(`Job file not found: ${file}`);
  return found;
}

/** Read + validate a job file. Returns the raw props (defaults not applied). */
export function loadJob(file: string): LoadedJob {
  const path = resolveJobPath(file);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`${file} is not valid JSON: ${(err as Error).message}`);
  }
  const job = z.object({ template: z.string(), props: z.record(z.string(), z.unknown()) }).safeParse(raw);
  if (!job.success) throw new Error(`${file} must look like { "template": "<Id>", "props": { … } }`);
  const template = getTemplate(job.data.template);
  const parsed = template.schema.safeParse(job.data.props);
  if (!parsed.success) throw new Error(`${file} has invalid props for ${template.id}:\n${formatIssues(parsed.error)}`);
  return { ...job.data, path, slug: basename(path).replace(/\.json$/, '') };
}

/** Props with schema defaults applied (what the renderer will see). */
export function parsedProps(job: Job): Record<string, unknown> {
  return getTemplate(job.template).schema.parse(job.props) as Record<string, unknown>;
}

export function writeJob(path: string, job: Job): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ template: job.template, props: job.props }, null, 2)}\n`);
}
