import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DatabasePreset, Lang } from './types.js';

export const MANIFEST_FILE = 'adjskit.json';

export interface AdjskitManifest {
  framework: 'adjskit';
  version: number;
  lang: Lang;
  db: DatabasePreset;
  prefix: string | null;
  /** Framework-managed file path -> sha256 of its content at scaffold time. */
  managedFiles: Record<string, string>;
}

/** Walks up from `startDir` looking for a package.json that depends on @adjskit/core. */
export function findProjectRoot(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 24; i++) {
    const pkg = join(dir, 'package.json');
    if (existsSync(pkg)) {
      const content = readFileSync(pkg, 'utf8');
      if (content.includes('@adjskit/core')) return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Detects the project language from the presence of jsconfig.json vs tsconfig.json. */
export function detectLang(root: string): Lang {
  if (existsSync(join(root, 'jsconfig.json'))) return 'js';
  return 'ts';
}

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function readManifest(root: string): AdjskitManifest | null {
  const path = join(root, MANIFEST_FILE);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as AdjskitManifest;
  } catch {
    return null;
  }
}

export function writeManifest(root: string, manifest: AdjskitManifest): void {
  writeFileSync(join(root, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
}

export function readPackageJson(root: string): Record<string, any> {
  const path = join(root, 'package.json');
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, any>;
  } catch {
    return {};
  }
}

export function writePackageJson(root: string, pkg: Record<string, any>): void {
  writeFileSync(join(root, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
}
