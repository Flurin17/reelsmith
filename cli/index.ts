/**
 * reelsmith — CLI for brandable, data-driven short-form videos.
 *
 *   pnpm reelsmith <command> [options]
 *
 * Built to be driven by coding agents: every command is non-interactive,
 * validates its input with actionable errors, and prints file paths.
 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { DEFAULT_BRAND } from '../brands';
import { slugify } from '../src/core/text';
import { TEMPLATES } from '../src/templates';
import { BUILDERS } from './lib/builders';
import { brandReport } from './lib/brand';
import { loadCatalog } from './lib/catalog';
import { contextText } from './lib/context';
import { describeTemplate } from './lib/describe';
import { removeWhiteBackground } from './lib/cutout';
import { JOBS, OUT, PUBLIC, ROOT, rel } from './lib/env';
import { getTemplate, loadJob, parsedProps, writeJob } from './lib/jobs';
import { renderStills, renderVideo } from './lib/render';
import { assetChecks, narration, reviewJob } from './lib/review';
import { generateSfx } from './lib/sfx';
import { generateVoiceovers } from './lib/voiceover';
import { audition, libraryVoices, workspaceVoices } from './lib/voices';

const HELP = `reelsmith — on-brand short-form video, driven by agents

Orient
  context                           Where to edit what, brands, templates, the loop (start here)
  describe <Template> [--json]      Compact props signature + example job
  brand [id]                        Brand tokens + contrast check
  catalog [--brand id] [--category x] [--json]

Create jobs (jobs/<slug>.json)
  new <Template> <slug> [--brand id]      Minimal example job to edit
  make <Template> [--brand id] [flags]    From the brand catalog (ProductSpotlight, TopList)
  validate <job...>

Produce
  voiceover <job> [--scene id] [--force] [--dry-run]   TTS per scene → clip + timing sidecar
  review <job> [--frames 0,90] [--json] [--strict]     Graded key frames → out/review/<slug>/
  stills <job> [--frames 0,90]                         Just the frames + sheet
  render <job...> [--draft] [--allow-missing]          MP4 → out/<slug>.mp4

Assets
  voices [--language en] [--gender female] [--workspace] · audition <id[,id]>
  sfx · cutout <in> <out.png>

\`pnpm studio\` opens Remotion Studio for humans.`;

function flags(argv: string[]) {
  return parseArgs({
    args: argv,
    allowPositionals: true,
    strict: false,
    options: {
      json: { type: 'boolean' },
      force: { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      draft: { type: 'boolean' },
      refresh: { type: 'boolean' },
      workspace: { type: 'boolean' },
      strict: { type: 'boolean' },
      'allow-missing': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      brand: { type: 'string' },
      // String options must be declared, otherwise `--flag value` parses as a boolean + positional.
      ...Object.fromEntries(
        [
          'product',
          'hook',
          'ids',
          'category',
          'count',
          'sort',
          'title',
          'subtitle',
          'slug',
          'scene',
          'frames',
          'out',
          'language',
          'gender',
          'search',
          'use-case',
          'limit',
          'text',
        ].map((name) => [name, { type: 'string' as const }]),
      ),
    },
  });
}

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { values, positionals } = flags(rest);
  const v = values as Record<string, string | boolean | undefined>;

  switch (command) {
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      console.log(HELP);
      return;

    case 'context':
      console.log(contextText());
      return;

    case 'list':
      for (const t of TEMPLATES) {
        console.log(
          `${t.id.padEnd(18)} ${t.description}${BUILDERS[t.id] ? `\n${''.padEnd(18)} make: ${BUILDERS[t.id].usage}` : ''}`,
        );
      }
      return;

    case 'brand': {
      const id = positionals[0] ?? str(v.brand) ?? DEFAULT_BRAND;
      const { lines, failures } = brandReport(id);
      console.log(lines.join('\n'));
      if (failures) {
        console.log(`\n${failures} pair(s) below the minimum — adjust colors in brands/${id}/theme.ts.`);
        process.exitCode = 1;
      }
      return;
    }

    case 'describe': {
      const template = getTemplate(need(positionals[0], 'describe <Template>'));
      if (v.json) {
        const schema = z.toJSONSchema(template.schema, { io: 'input', unrepresentable: 'any' });
        console.log(
          JSON.stringify({ id: template.id, description: template.description, schema, example: template.example }),
        );
      } else console.log(describeTemplate(template));
      return;
    }

    case 'catalog': {
      const products = await loadCatalog(str(v.brand));
      const needle = str(v.category)?.toLowerCase();
      const shown = needle ? products.filter((p) => p.category.toLowerCase().includes(needle)) : products;
      if (v.json) console.log(JSON.stringify(shown, null, 2));
      else
        for (const p of shown)
          console.log(
            `${p.id.padEnd(22)} ${p.name.padEnd(28)} ${String(p.price).padStart(8)}  ${p.category}${p.available ? '' : '  (unavailable)'}`,
          );
      return;
    }

    case 'new': {
      const template = getTemplate(need(positionals[0], 'new <Template> <slug>'));
      const slug = slugify(need(positionals[1], 'new <Template> <slug>'));
      const path = join(JOBS, `${slug}.json`);
      if (existsSync(path) && !v.force) throw new Error(`${rel(path)} exists (use --force to overwrite)`);
      const props = structuredClone(template.example);
      if (str(v.brand)) props.brand = str(v.brand);
      writeJob(path, { template: template.id, props });
      console.log(`✓ ${rel(path)} — edit it, then: pnpm reelsmith review ${rel(path)}`);
      return;
    }

    case 'make': {
      const id = need(positionals[0], 'make <Template> [flags]');
      getTemplate(id);
      const builder = BUILDERS[id];
      if (!builder)
        throw new Error(`${id} has no catalog builder. Use \`reelsmith new ${id} <slug>\` and edit the props.`);
      const { job, slug } = await builder.build({
        brand: str(v.brand),
        product: str(v.product),
        hook: str(v.hook),
        ids: str(v.ids),
        category: str(v.category),
        count: str(v.count),
        sort: str(v.sort),
        title: str(v.title),
        subtitle: str(v.subtitle),
        refresh: Boolean(v.refresh),
      });
      const path = join(JOBS, `${str(v.slug) ?? slug}.json`);
      writeJob(path, job);
      loadJob(path); // validate what we wrote
      console.log(`✓ ${rel(path)}`);
      return;
    }

    case 'validate': {
      if (positionals.length === 0) throw new Error('validate <job...>');
      let failed = 0;
      for (const file of positionals) {
        try {
          const job = loadJob(file);
          console.log(`✓ ${rel(job.path)} (${job.template})`);
        } catch (err) {
          failed++;
          console.error(`✗ ${(err as Error).message}`);
        }
      }
      if (failed) process.exitCode = 1;
      return;
    }

    case 'voiceover': {
      const job = loadJob(need(positionals[0], 'voiceover <job>'));
      console.log(`Voiceover for ${rel(job.path)}`);
      await generateVoiceovers(job, {
        scene: str(v.scene),
        force: Boolean(v.force),
        dryRun: Boolean(v['dry-run']),
      });
      return;
    }

    case 'stills': {
      const job = loadJob(need(positionals[0], 'stills <job>'));
      const frames = str(v.frames)
        ?.split(',')
        .map((f) => Number(f.trim()));
      const outDir = resolve(ROOT, str(v.out) ?? join('out', 'stills', job.slug));
      console.log(`Rendering stills for ${rel(job.path)}…`);
      const { files, sheet } = await renderStills(job, { frames, outDir });
      for (const f of files) console.log(`  ${rel(f)}`);
      console.log(`✓ contact sheet: ${rel(sheet)}`);
      return;
    }

    case 'review': {
      const job = loadJob(need(positionals[0], 'review <job>'));
      const frames = str(v.frames)
        ?.split(',')
        .map((f) => Number(f.trim()));
      if (!v.json) console.log(`Reviewing ${rel(job.path)}…`);
      const r = await reviewJob(job, { frames });
      if (v.json) {
        console.log(JSON.stringify(r, null, 2));
      } else {
        console.log(
          `\nScore ${r.score}/100 — ${r.passed ? 'PASS' : 'NEEDS WORK'} (${r.counts.error} errors, ${r.counts.warn} warnings, ${r.durationSeconds.toFixed(1)}s)`,
        );
        const top = r.findings.filter((f) => f.severity !== 'info').slice(0, 12);
        for (const f of top)
          console.log(
            `  ${f.severity === 'error' ? '✗' : '!'} ${f.rule}${f.frame != null ? ` @${f.frame}` : ''}: ${f.message}`,
          );
        if (r.findings.length > top.length) console.log(`  … see the report for all ${r.findings.length} findings`);
        const script = narration(parsedProps(job));
        if (script) console.log(`script: ${script}`);
        console.log(`look at: ${r.sheet}   (full frames: out/review/${job.slug}/frames/, report: ${r.report})`);
      }
      if (v.strict && !r.passed) process.exitCode = 1;
      return;
    }

    case 'render': {
      if (positionals.length === 0) throw new Error('render <job...>');
      const outDir = resolve(ROOT, str(v.out) ?? 'out');
      for (const file of positionals) {
        const job = loadJob(file);
        const missing = assetChecks(parsedProps(job));
        if (missing.length && !v['allow-missing']) {
          throw new Error(
            `${rel(job.path)} references missing files:\n${missing.map((m) => `  - ${m.message}`).join('\n')}\n(pass --allow-missing to render placeholders)`,
          );
        }
        const output = join(outDir, `${job.slug}${v.draft ? '.draft' : ''}.mp4`);
        console.log(`Rendering ${job.template} → ${rel(output)}`);
        await renderVideo(job, { output, draft: Boolean(v.draft) });
        console.log(`✓ ${rel(output)}`);
      }
      return;
    }

    case 'voices':
      if (v.workspace) await workspaceVoices({ search: str(v.search), json: Boolean(v.json) });
      else
        await libraryVoices({
          language: str(v.language),
          gender: str(v.gender),
          search: str(v.search),
          useCase: str(v['use-case']),
          limit: str(v.limit) ? Number(v.limit) : undefined,
          json: Boolean(v.json),
        });
      return;

    case 'audition': {
      const ids = need(positionals[0], 'audition <voiceId[,voiceId]>').split(',');
      const out = await audition({
        voices: ids,
        text: str(v.text),
        out: join(OUT, 'auditions', `${ids.join('+')}.mp3`),
      });
      console.log(`✓ ${rel(out)}`);
      return;
    }

    case 'sfx':
      for (const name of generateSfx(join(PUBLIC, 'sfx'))) console.log(`✓ public/sfx/${name}`);
      return;

    case 'cutout': {
      const [input, output] = positionals;
      if (!input || !output) throw new Error('cutout <in> <out.png>');
      await removeWhiteBackground(resolve(input), resolve(output));
      console.log(`✓ ${output}`);
      return;
    }

    default:
      throw new Error(`Unknown command "${command}". Run \`pnpm reelsmith help\`.`);
  }
}

function need(value: string | undefined, usage: string): string {
  if (!value) throw new Error(`Usage: reelsmith ${usage}`);
  return value;
}

main().catch((err) => {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  if (process.env.REELSMITH_DEBUG && err instanceof Error) console.error(err.stack);
  process.exit(1);
});
