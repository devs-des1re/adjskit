import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleCreate } from '../src/commands/create.js';
import type { CreateOptions, DatabasePreset, Lang } from '../src/types.js';

const PRESETS: readonly DatabasePreset[] = [
  'none',
  'file',
  'sqlite',
  'postgres',
  'mysql',
  'mongo',
  'redis',
];
const LANGS: readonly Lang[] = ['ts', 'js'];

function opts(targetDir: string, name: string, lang: Lang, db: DatabasePreset): CreateOptions {
  return { name, lang, db, prefix: '!', install: false, git: false, targetDir };
}

function expectedDbFiles(db: DatabasePreset, lang: Lang): string[] {
  const e = `.${lang}`;
  switch (db) {
    case 'none':
    case 'file':
      return [];
    case 'sqlite':
    case 'postgres':
    case 'mysql':
      return [
        `src/db/index${e}`,
        `src/db/schema${e}`,
        `src/db/queries/cooldown${e}`,
        'drizzle.config.ts',
      ];
    case 'mongo':
      return [`src/db/index${e}`, `src/db/schema${e}`];
    case 'redis':
      return [`src/db/index${e}`];
  }
}

function expectedDbDeps(db: DatabasePreset): string[] {
  switch (db) {
    case 'sqlite':
      return ['drizzle-orm', 'better-sqlite3'];
    case 'postgres':
      return ['drizzle-orm', 'pg'];
    case 'mysql':
      return ['drizzle-orm', 'mysql2'];
    case 'mongo':
      return ['mongoose'];
    case 'redis':
      return ['ioredis'];
    default:
      return [];
  }
}

describe('create scaffolds every preset in TS and JS', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'adjskit-create-'));
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  for (const db of PRESETS) {
    for (const lang of LANGS) {
      it(`${lang.toUpperCase()} / ${db}`, async () => {
        const targetDir = join(tempRoot, `${db}-${lang}`);
        await handleCreate(opts(targetDir, `bot-${db}-${lang}`, lang, db));

        // common files
        const e = `.${lang}`;
        for (const file of [
          'package.json',
          '.env.example',
          '.gitignore',
          '.prettierrc.json',
          '.prettierignore',
          lang === 'ts' ? 'tsconfig.json' : 'jsconfig.json',
          `src/index${e}`,
          `src/config${e}`,
          `src/commands/ping${e}`,
          `src/events/ready${e}`,
          'src/buttons/.gitkeep',
          'src/modals/.gitkeep',
          'src/dropdowns/.gitkeep',
          ...expectedDbFiles(db, lang),
        ]) {
          expect(existsSync(join(targetDir, file)), `${file} should exist`).toBe(true);
        }

        // package.json carries the right db deps + scripts
        const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf8'));
        expect(pkg.dependencies['@adjskit/core']).toBeDefined();
        expect(pkg.dependencies['discord.js']).toBeDefined();
        for (const dep of expectedDbDeps(db)) {
          expect(pkg.dependencies[dep], `${dep} dep`).toBeDefined();
        }
        expect(pkg.scripts.dev).toBeDefined();
        expect(pkg.scripts.start).toBeDefined();
        if (db === 'sqlite' || db === 'postgres' || db === 'mysql') {
          expect(pkg.scripts['db:generate']).toBeDefined();
        }

        // the example command wires the builder
        const ping = readFileSync(join(targetDir, `src/commands/ping${e}`), 'utf8');
        expect(ping).toContain("createCommand('ping')");

        // JS output must be type-stripped (no `import type`)
        if (lang === 'js') {
          const index = readFileSync(join(targetDir, `src/index${e}`), 'utf8');
          expect(index).not.toContain('import type');
          const config = readFileSync(join(targetDir, `src/config${e}`), 'utf8');
          expect(config).not.toContain('import type');
        }
      });
    }
  }

  it('throws when the target directory is not empty', async () => {
    const targetDir = join(tempRoot, 'occupied');
    await handleCreate(opts(targetDir, 'occupied', 'ts', 'none'));
    await expect(handleCreate(opts(targetDir, 'occupied', 'ts', 'none'))).rejects.toThrow(
      /not empty/,
    );
  });
});
