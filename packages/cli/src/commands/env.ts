import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findProjectRoot, detectLang, readManifest } from '../project.js';

function extractEnvKeys(content: string): Set<string> {
  const keys = new Set<string>();
  // process.env.X and bare X in .env lines
  const re = /process\.env\.([A-Z0-9_]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    if (m[1]) keys.add(m[1]);
  }
  return keys;
}

const DB_ENV: Record<string, string[]> = {
  sqlite: ['DATABASE_URL'],
  postgres: ['DATABASE_URL'],
  mysql: ['DATABASE_URL'],
  mongo: ['MONGODB_URI'],
  redis: ['REDIS_URL'],
};

/** Returns the sorted, unique list of env var names a project needs. */
export function requiredEnv(cwd: string): string[] {
  const root = findProjectRoot(cwd);
  if (!root) return [];
  const lang = detectLang(root);
  const keys = new Set<string>(['DISCORD_TOKEN', 'DISCORD_CLIENT_ID']);

  const config = join(root, `src/config${lang === 'ts' ? '.ts' : '.js'}`);
  if (existsSync(config)) {
    for (const key of extractEnvKeys(readFileSync(config, 'utf8'))) keys.add(key);
  }

  const manifest = readManifest(root);
  if (manifest) {
    for (const key of DB_ENV[manifest.db] ?? []) keys.add(key);
  }

  return [...keys].sort();
}

export function handleEnv(cwd: string = process.cwd()): void {
  const keys = requiredEnv(cwd);
  if (keys.length === 0) {
    console.log('No adjskit project found.');
    process.exitCode = 1;
    return;
  }
  for (const key of keys) console.log(key);
}
