import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { findProjectRoot, detectLang } from '../project.js';
import { addFile, type AddKind } from '../generators/add.js';
import { writeFiles } from '../utils.js';

/** Generates a new command/event/button/modal/dropdown stub inside the project. */
export async function handleAdd(
  kind: AddKind,
  name: string,
  cwd: string = process.cwd(),
): Promise<void> {
  const root = findProjectRoot(cwd);
  if (!root) {
    throw new Error('No adjskit project found. Run this inside a scaffolded project.');
  }

  const lang = detectLang(root);
  const file = addFile(kind, name, lang);
  const target = join(root, file.path);
  if (existsSync(target)) {
    throw new Error(`File already exists: ${file.path}`);
  }

  writeFiles(root, [file]);
  console.log(pc.green(`Created ${file.path}`));
}
