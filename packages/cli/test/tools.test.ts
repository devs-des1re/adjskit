import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleCreate } from '../src/commands/create.js';
import { handleAdd } from '../src/commands/add.js';
import { handleUpdate } from '../src/commands/update.js';
import { diagnose } from '../src/commands/doctor.js';
import { requiredEnv } from '../src/commands/env.js';
import type { CreateOptions, DatabasePreset, Lang } from '../src/types.js';

function scaffold(dir: string, lang: Lang, db: DatabasePreset): string {
  const targetDir = join(dir, 'bot');
  const opts: CreateOptions = {
    name: 'bot',
    lang,
    db,
    prefix: '!',
    install: false,
    git: false,
    targetDir,
  };
  handleCreate(opts);
  return targetDir;
}

describe('add', () => {
  let tempRoot: string;
  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'adjskit-tools-'));
  });
  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('generates stubs for each kind with nested path support', async () => {
    const root = scaffold(tempRoot, 'ts', 'none');
    await handleAdd('command', 'admin/ban', root);
    await handleAdd('event', 'guildMemberAdd', root);
    await handleAdd('button', 'confirm_ban', root);
    await handleAdd('modal', 'feedback', root);
    await handleAdd('dropdown', 'role_menu', root);

    expect(existsSync(join(root, 'src/commands/admin/ban.ts'))).toBe(true);
    expect(existsSync(join(root, 'src/events/guildMemberAdd.ts'))).toBe(true);
    expect(existsSync(join(root, 'src/buttons/confirm_ban.ts'))).toBe(true);
    expect(existsSync(join(root, 'src/modals/feedback.ts'))).toBe(true);
    expect(existsSync(join(root, 'src/dropdowns/role_menu.ts'))).toBe(true);

    const ban = readFileSync(join(root, 'src/commands/admin/ban.ts'), 'utf8');
    expect(ban).toContain("createCommand('ban')");
    // default export is a builder (no .build()) — loaders normalize it
    expect(ban).not.toContain('.build()');
  });

  it('detects JS projects and generates .js stubs', async () => {
    const root = scaffold(tempRoot, 'js', 'none');
    await handleAdd('button', 'hello', root);
    expect(existsSync(join(root, 'src/buttons/hello.js'))).toBe(true);
    const js = readFileSync(join(root, 'src/buttons/hello.js'), 'utf8');
    expect(js).not.toContain('import type');
  });

  it('refuses to overwrite an existing file', async () => {
    const root = scaffold(tempRoot, 'ts', 'none');
    await expect(handleAdd('command', 'ping', root)).rejects.toThrow(/already exists/);
  });
});

describe('update', () => {
  let tempRoot: string;
  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'adjskit-upd-'));
  });
  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('regenerates unchanged managed files (no-op when up to date)', async () => {
    const root = scaffold(tempRoot, 'ts', 'none');
    const before = readFileSync(join(root, 'src/index.ts'), 'utf8');
    await handleUpdate({ root, install: false });
    expect(readFileSync(join(root, 'src/index.ts'), 'utf8')).toBe(before);
  });

  it('skips a user-modified managed file, then overwrites with --force', async () => {
    const root = scaffold(tempRoot, 'ts', 'none');
    const p = join(root, 'src/index.ts');
    writeFileSync(p, `${readFileSync(p, 'utf8')}\n// user edit\n`);

    await handleUpdate({ root, install: false });
    expect(readFileSync(p, 'utf8')).toContain('// user edit');

    await handleUpdate({ root, install: false, force: true });
    expect(readFileSync(p, 'utf8')).not.toContain('// user edit');
  });

  it('--dry-run does not write anything', async () => {
    const root = scaffold(tempRoot, 'ts', 'none');
    const p = join(root, 'src/index.ts');
    const original = readFileSync(p, 'utf8');
    writeFileSync(p, `${original}\n// user edit\n`);

    await handleUpdate({ root, install: false, dryRun: true });
    expect(readFileSync(p, 'utf8')).toContain('// user edit');
  });
});

describe('doctor', () => {
  let tempRoot: string;
  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'adjskit-doc-'));
  });
  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('flags a missing config file', () => {
    const root = scaffold(tempRoot, 'ts', 'none');
    rmSync(join(root, 'src/config.ts'));
    const { issues } = diagnose(root);
    expect(issues.some((i) => i.level === 'error' && i.message.includes('src/config'))).toBe(true);
  });

  it('flags missing required env values', () => {
    const root = scaffold(tempRoot, 'ts', 'none');
    writeFileSync(join(root, '.env'), 'DISCORD_TOKEN=\nDISCORD_CLIENT_ID=\n');
    const { issues } = diagnose(root);
    expect(issues.some((i) => i.level === 'error' && i.message.includes('DISCORD_TOKEN'))).toBe(
      true,
    );
  });

  it('reports missing db dependencies', () => {
    const root = scaffold(tempRoot, 'ts', 'mongo');
    const pkgPath = join(root, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    delete pkg.dependencies.mongoose;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    const { issues } = diagnose(root);
    expect(issues.some((i) => i.level === 'error' && i.message.includes('mongoose'))).toBe(true);
  });
});

describe('env + sync', () => {
  let tempRoot: string;
  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'adjskit-env-'));
  });
  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('lists required env vars including db-specific ones', () => {
    const root = scaffold(tempRoot, 'ts', 'sqlite');
    const keys = requiredEnv(root);
    expect(keys).toContain('DISCORD_TOKEN');
    expect(keys).toContain('DISCORD_CLIENT_ID');
    expect(keys).toContain('DATABASE_URL');
  });

  it('scaffolds the sync script used by `sync`', () => {
    const root = scaffold(tempRoot, 'ts', 'none');
    expect(existsSync(join(root, 'scripts/syncCommands.ts'))).toBe(true);
    const script = readFileSync(join(root, 'scripts/syncCommands.ts'), 'utf8');
    expect(script).toContain('loadCommands');
  });
});
