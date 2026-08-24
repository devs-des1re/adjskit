#!/usr/bin/env node
/**
 * Copies the repo-root README.md and LICENSE into the current package
 * directory so `pnpm pack` / `pnpm publish` include them in the tarball (npm
 * auto-includes both when present next to package.json), then removes them
 * afterwards so they don't clutter the working tree.
 *
 * Usage (wired as prepack/postpack):
 *   node ../../scripts/sync-package-assets.mjs          # copy
 *   node ../../scripts/sync-package-assets.mjs --clean  # remove
 */
import { copyFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const clean = process.argv.includes('--clean');

for (const name of ['README.md', 'LICENSE']) {
  const target = join(process.cwd(), name);
  if (clean) {
    rmSync(target, { force: true });
  } else {
    copyFileSync(join(root, name), target);
  }
}
