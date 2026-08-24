import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import {
  findProjectRoot,
  readManifest,
  readPackageJson,
  writePackageJson,
  writeManifest,
  hashContent,
} from '../project.js';
import { generateManagedFiles, CORE_VERSION } from '../generators/templates.js';
import { writeFile } from '../utils.js';
import type { CreateOptions } from '../types.js';

export interface UpdateOptions {
  root?: string;
  force?: boolean;
  dryRun?: boolean;
  install?: boolean;
  coreVersion?: string;
}

/**
 * Refreshes framework-managed files from the current templates without
 * touching user-owned files (commands/, events/, components/, src/config).
 * A managed file is only regenerated when its on-disk content still matches
 * the hash recorded in adjskit.json (i.e. the user hasn't edited it); modified
 * files are skipped unless `--force`.
 */
export async function handleUpdate(opts: UpdateOptions = {}): Promise<void> {
  const root = opts.root ?? findProjectRoot(process.cwd());
  if (!root) {
    console.error(pc.red('No adjskit project found. Run this inside a scaffolded project.'));
    process.exit(1);
  }

  const manifest = readManifest(root);
  if (!manifest) {
    console.error(
      pc.red(
        `No ${pc.cyan('adjskit.json')} manifest found — this project was not scaffolded by adjskit.`,
      ),
    );
    process.exit(1);
  }

  const pkg = readPackageJson(root);
  const createOpts: CreateOptions = {
    name: (pkg.name as string) ?? 'bot',
    lang: manifest.lang,
    db: manifest.db,
    prefix: manifest.prefix,
    install: false,
    git: false,
    targetDir: root,
  };
  const fresh = generateManagedFiles(createOpts);
  const freshByPath = new Map(fresh.map((file) => [file.path, file.content]));

  const regenerate: string[] = [];
  const newFiles: string[] = [];
  const skipped: string[] = [];

  for (const [path, recordedHash] of Object.entries(manifest.managedFiles)) {
    if (!freshByPath.has(path)) continue; // no longer managed; leave the file in place
    const current = existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : null;
    if (current === null || opts.force || hashContent(current) === recordedHash) {
      regenerate.push(path);
    } else {
      skipped.push(path);
    }
  }
  for (const file of fresh) {
    if (!(file.path in manifest.managedFiles)) newFiles.push(file.path);
  }

  const coreVersion = opts.coreVersion ?? CORE_VERSION;

  if (opts.dryRun) {
    console.log(pc.cyan('Dry run — would update:'));
    for (const path of regenerate) console.log(pc.green(`  regenerate  ${path}`));
    for (const path of newFiles) console.log(pc.green(`  add         ${path}`));
    for (const path of skipped) console.log(pc.yellow(`  skip        ${path} (modified)`));
    console.log(pc.cyan(`  bump        @adjskit/core -> ${coreVersion}`));
    return;
  }

  for (const path of [...regenerate, ...newFiles]) {
    writeFile(root, path, freshByPath.get(path) ?? '');
  }
  for (const path of skipped) {
    console.log(pc.yellow(`Skipped modified file: ${path} (use --force to overwrite)`));
  }

  if (pkg.dependencies) {
    pkg.dependencies['@adjskit/core'] = coreVersion;
    writePackageJson(root, pkg);
  }

  const newManaged: Record<string, string> = {};
  for (const file of fresh) newManaged[file.path] = hashContent(file.content);
  writeManifest(root, { ...manifest, managedFiles: newManaged });

  console.log(pc.green(`Updated ${regenerate.length + newFiles.length} framework file(s).`));

  if (opts.install) {
    console.log(pc.cyan('\nInstalling dependencies…'));
    execFileSync('npm', ['install'], { cwd: root, stdio: 'inherit' });
  }
}
