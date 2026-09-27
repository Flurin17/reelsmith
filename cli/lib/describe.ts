/**
 * Compact, TypeScript-like description of a template's props — a fraction of
 * the tokens of JSON Schema, which is what agents need to write a valid job.
 *
 *   scenes: Scene[]
 *   captions?: boolean = true   // show word captions of `say`
 *   Scene { id: string; say?: string = ""; visual?: Visual … }
 */
import { z } from 'zod';
import type { Template } from '../../src/core/template';

type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  description?: string;
  minItems?: number;
  maxItems?: number;
};

/** Fields hidden from agents: filled by the pipeline, never written by hand. */
const INTERNAL = new Set(['captions']);
/** Big objects with good defaults: list keys only. */
const COLLAPSE = new Set(['sfx', 'music', 'seconds']);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const singular = (s: string) => cap(s.replace(/ies$/, 'y').replace(/s$/, ''));
const lit = (v: unknown) => JSON.stringify(v);

export function describeTemplate(template: Template<any>): string {
  const schema = z.toJSONSchema(template.schema, { io: 'input', unrepresentable: 'any' }) as JsonSchema;
  const named: [string, string][] = [];

  const type = (s: JsonSchema, name: string, depth: number): string => {
    const union = s.anyOf ?? s.oneOf;
    if (union) {
      const variants = union.filter((u) => u.type !== 'null');
      if (variants.every((v) => v.properties?.type?.const !== undefined)) {
        const tname = cap(name);
        named.push([`${tname} (one of)`, variants.map((v) => `  ${inline(v, tname, depth + 1)}`).join('\n')]);
        return tname;
      }
      return variants.map((v) => type(v, name, depth)).join(' | ');
    }
    if (s.const !== undefined) return lit(s.const);
    if (s.enum) return s.enum.map(lit).join(' | ');
    if (s.type === 'array' && s.items) {
      const inner = type(s.items, singular(name), depth);
      const bounds =
        s.minItems && s.maxItems
          ? ` (${s.minItems}–${s.maxItems})`
          : s.minItems
            ? ` (≥${s.minItems})`
            : s.maxItems
              ? ` (≤${s.maxItems})`
              : '';
      return `${inner.includes(' ') ? `(${inner})` : inner}[]${bounds}`;
    }
    if (s.type === 'object' && s.properties) {
      const keys = Object.keys(s.properties).filter((k) => !INTERNAL.has(k));
      if (COLLAPSE.has(name)) return `{ ${keys.join(', ')} }`;
      const simple =
        keys.length <= 4 && keys.every((k) => !['object', 'array'].includes(String(s.properties![k].type)));
      if (simple || depth > 2) return inline(s, name, depth + 1);
      const tname = cap(name);
      named.push([tname, fields(s, depth + 1)]);
      return tname;
    }
    return String(s.type ?? 'unknown');
  };

  const field = (key: string, s: JsonSchema, required: boolean, depth: number) => {
    const t = type(s, key, depth);
    const def = s.default !== undefined && !COLLAPSE.has(key) ? ` = ${lit(s.default)}` : '';
    return { head: `${key}${required ? '' : '?'}: ${t}${def}`, note: s.description ?? '' };
  };

  const inline = (s: JsonSchema, name: string, depth: number) =>
    `{ ${Object.entries(s.properties ?? {})
      .filter(([k]) => !INTERNAL.has(k))
      .map(([k, v]) => field(k, v, s.required?.includes(k) ?? false, depth).head)
      .join('; ')} }`;

  const fields = (s: JsonSchema, depth: number) => {
    const rows = Object.entries(s.properties ?? {})
      .filter(([k]) => !INTERNAL.has(k))
      .map(([k, v]) => field(k, v, s.required?.includes(k) ?? false, depth));
    const width = Math.min(46, Math.max(...rows.map((r) => r.head.length)));
    return rows.map((r) => (r.note ? `  ${r.head.padEnd(width)}  // ${r.note}` : `  ${r.head}`)).join('\n');
  };

  const top = fields(schema, 0);
  const lines = [`${template.id} — ${template.description}`, '', 'props:', top];
  for (const [n, body] of named) lines.push('', `${n}:`, body);
  lines.push('', 'example job:', JSON.stringify({ template: template.id, props: template.example }));
  return lines.join('\n');
}
