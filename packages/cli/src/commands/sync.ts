import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { findProjectRoot, detectLang } from '../project.js';
import { runCommand } from '../utils.js';

/**
 * Registers slash commands without starting the bot by running the project's
 * generated `scripts/syncCommands` file (via tsx for TS, node for JS).
 */
export async function runSync(cwd: string = process.cwd()): Promise<void> {
  const root = findProjectRoot(cwd);
  if (!root) {
    console.error(pc.red('No adjskit project found. Run this inside a scaffolded project.'));
    process.exit(1);
  }

  const lang = detectLang(root);
  const script = `scripts/syncCommands${lang === 'ts' ? '.ts' : '.js'}`;
  if (!existsSync(join(root, script))) {
    console.error(
      pc.red(`Missing ${script}. Re-run ${pc.cyan('adjskit update')} to regenerate it.`),
    );
    process.exit(1);
  }

  const command = lang === 'ts' ? 'npx' : 'node';
  const args = lang === 'ts' ? ['tsx', script] : [script];
  console.log(pc.cyan(`Syncing slash commands…`));
  runCommand(root, command, args);
}
