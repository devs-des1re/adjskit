import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { findProjectRoot, detectLang, readManifest, readPackageJson } from '../project.js';
import { dbDependencyNames } from '../generators/templates.js';

export interface Issue {
  level: 'error' | 'warn' | 'info';
  message: string;
}

const REQUIRED_ENV = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];

function has(content: string, needle: string): boolean {
  return content.includes(needle);
}

function readIfExists(root: string, path: string): string | null {
  const full = join(root, path);
  return existsSync(full) ? readFileSync(full, 'utf8') : null;
}

/** Inspects an adjskit project and returns a list of findings. */
export function diagnose(cwd: string): { root: string | null; issues: Issue[] } {
  const root = findProjectRoot(cwd);
  if (!root) {
    return { root: null, issues: [{ level: 'error', message: 'No adjskit project found here.' }] };
  }

  const issues: Issue[] = [];
  const lang = detectLang(root);
  const e = lang === 'ts' ? '.ts' : '.js';
  const pkg = readPackageJson(root);
  const manifest = readManifest(root);

  if (!pkg.name) issues.push({ level: 'warn', message: 'package.json is missing or has no name.' });
  for (const dep of ['@adjskit/core', 'discord.js', 'zod', 'dotenv']) {
    if (!pkg.dependencies?.[dep]) {
      issues.push({ level: 'error', message: `Missing dependency: ${dep}` });
    }
  }

  if (!existsSync(join(root, `src/config${e}`))) {
    issues.push({ level: 'error', message: `Missing src/config${e}.` });
  }
  if (!existsSync(join(root, `src/index${e}`))) {
    issues.push({ level: 'error', message: `Missing src/index${e}.` });
  }
  for (const folder of ['commands', 'events', 'buttons', 'modals', 'dropdowns']) {
    if (!existsSync(join(root, 'src', folder))) {
      issues.push({ level: 'warn', message: `Missing src/${folder}/ folder.` });
    }
  }

  if (manifest) {
    const expected = dbDependencyNames(manifest.db);
    for (const dep of expected) {
      if (!pkg.dependencies?.[dep]) {
        issues.push({ level: 'error', message: `Missing ${manifest.db} dependency: ${dep}` });
      }
    }
  } else {
    issues.push({
      level: 'warn',
      message: 'No adjskit.json manifest found — update/doctor may be limited.',
    });
  }

  const env = readIfExists(root, '.env');
  if (!env) {
    issues.push({ level: 'warn', message: 'No .env file found (create one from .env.example).' });
  } else {
    for (const key of REQUIRED_ENV) {
      const value = env
        .split('\n')
        .find((l) => l.startsWith(`${key}=`))
        ?.split('=')[1]
        ?.trim();
      if (!value) issues.push({ level: 'error', message: `Missing ${key} in .env.` });
    }
  }

  const config = readIfExists(root, `src/config${e}`);
  if (config && !has(config, 'defineConfig')) {
    issues.push({ level: 'error', message: 'src/config does not appear to use defineConfig().' });
  }

  return { root, issues };
}

export function handleDoctor(cwd: string = process.cwd()): void {
  const { issues } = diagnose(cwd);
  if (issues.length === 0) {
    console.log(pc.green('All checks passed.'));
    return;
  }
  for (const issue of issues) {
    const tag =
      issue.level === 'error'
        ? pc.red('[error]')
        : issue.level === 'warn'
          ? pc.yellow('[warn]')
          : pc.cyan('[info]');
    console.log(`  ${tag} ${issue.message}`);
  }
  if (issues.some((i) => i.level === 'error')) process.exitCode = 1;
}
