#!/usr/bin/env node
/**
 * Scaffolds a real bot project wired to the LOCAL @adjskit/core (via npm pack
 * + tarball install), so you can boot it against a real Discord token before
 * anything is published.
 *
 * Usage:
 *   node scripts/smoke.mjs [name] [--lang ts|js] [--db <preset>] [--prefix <p>] [--dir <path>]
 *
 * The project is scaffolded (without install), @adjskit/core is pointed at a
 * freshly-packed local tarball, and `npm install` runs. Fill in .env with a
 * real token, then `npm run dev`.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] ?? fallback : fallback;
}

const name = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'smoke-bot';
const lang = argValue('--lang', 'ts');
const db = argValue('--db', 'none');
const prefix = argValue('--prefix', '!');
const target = resolve(argValue('--dir', join(root, 'smoke-bot')));

function run(cwd, cmd) {
  const line = cmd
    .map((a) => (/[\s"']/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a))
    .join(' ');
  execFileSync(line, { cwd, stdio: 'inherit', shell: true });
}

// 1. Build the library + CLI.
console.log('\n[1/5] Building @adjskit/core + cli…');
run(root, ['pnpm', '--filter', '@adjskit/core', 'build']);
run(root, ['pnpm', '--filter', 'adjskit', 'build']);

// 2. Pack core to a temp tarball.
console.log('[2/5] Packing @adjskit/core…');
const packDir = join(tmpdir(), `adjskit-pack-${Date.now()}`);
mkdirSync(packDir, { recursive: true });
run(join(root, 'packages', 'core'), ['npm', 'pack', '--pack-destination', packDir]);
const tgz = readdirSync(packDir).find((f) => f.endsWith('.tgz'));
const tgzPath = join(packDir, tgz);

// 3. Scaffold the project.
console.log(`[3/5] Scaffolding ${name} (${lang}, db=${db})…`);
rmSync(target, { recursive: true, force: true });
mkdirSync(dirname(target), { recursive: true });
const cli = join(root, 'packages', 'cli', 'dist', 'index.js');
run(dirname(target), ['node', cli, 'create', basename(target), '--lang', lang, '--db', db, '--prefix', prefix, '--no-install']);

// 4. Point @adjskit/core at the local tarball.
console.log('[4/5] Wiring local @adjskit/core…');
const pkgPath = join(target, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
pkg.dependencies['@adjskit/core'] = `file:${tgzPath}`;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

// 5. Install dependencies.
console.log('[5/5] npm install…');
run(target, ['npm', 'install']);

console.log(`\nSmoke project ready at ${target}`);
console.log(`  cd ${target}`);
console.log('  cp .env.example .env   # add DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID');
console.log('  npm run dev\n');
