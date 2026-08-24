import { execFileSync } from 'node:child_process';
import type { ExecFileSyncOptions } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import ts from 'typescript';
import type { Lang } from './types.js';

/**
 * Spawns `command args...` in `dir`, inheriting stdio. On Windows, `npm`/`npx`
 * are `.cmd` shims that Node cannot spawn directly, so the command runs
 * through a shell as one joined string (arguments are static literals, never
 * user input); this also avoids Node's DEP0190 deprecation warning.
 */
export function runCommand(
  dir: string,
  command: string,
  args: string[],
  options: ExecFileSyncOptions = {},
): void {
  const base: ExecFileSyncOptions = { cwd: dir, stdio: 'inherit', ...options };
  if (process.platform === 'win32') {
    execFileSync([command, ...args].join(' '), { ...base, shell: true });
  } else {
    execFileSync(command, args, base);
  }
}

/** Runs `npm install` in `dir` (Windows-safe). */
export function npmInstall(dir: string): void {
  runCommand(dir, 'npm', ['install']);
}

/** Writes a file, creating parent directories as needed. */
export function writeFile(rootDir: string, relativePath: string, content: string): void {
  const fullPath = join(rootDir, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, 'utf8');
}

/** Writes many files (relative paths) under `rootDir`. */
export function writeFiles(rootDir: string, files: { path: string; content: string }[]): void {
  for (const file of files) writeFile(rootDir, file.path, file.content);
}

/** Runs `git init` + initial commit in `dir` (best-effort, never throws). */
export function gitInit(dir: string): void {
  try {
    execFileSync('git', ['init', '--quiet'], { cwd: dir, stdio: 'ignore' });
    execFileSync('git', ['add', '-A'], { cwd: dir, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'chore: scaffold adjskit project', '--quiet'], {
      cwd: dir,
      stdio: 'ignore',
    });
  } catch {
    // git not available or not configured; the project is still usable.
  }
}

/**
 * Transpiles TypeScript source to JavaScript (stripping types), preserving
 * ESM `import`/`export` statements and `.js` specifiers. The single source of
 * truth for every project file is authored as TypeScript; JS projects receive
 * the transpiled output.
 */
export function toJs(tsSource: string): string {
  const result = ts.transpileModule(tsSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      removeComments: false,
    },
  });
  // Drop the leading `"use strict";` that transpileModule can emit in non-ESM
  // modes; ESM output here is clean.
  return result.outputText.replace(/^"use strict";\s*\n/, '');
}

/** Returns the extension for source files in the given language. */
export function ext(lang: Lang): '.ts' | '.js' {
  return lang === 'ts' ? '.ts' : '.js';
}
