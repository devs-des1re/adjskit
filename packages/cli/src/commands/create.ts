import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { runCreateFlow } from '../prompts/createFlow.js';
import { generateFiles, generateManagedFiles, envExample } from '../generators/templates.js';
import { writeFile, writeFiles, gitInit } from '../utils.js';
import { hashContent, writeManifest, MANIFEST_FILE } from '../project.js';
import type { CreateOptions } from '../types.js';

/** Builds a real `.env` from provided secrets (everything else stays placeholder). */
function envFile(opts: CreateOptions): string {
  return (
    [
      '# Discord',
      `DISCORD_TOKEN=${opts.token ?? ''}`,
      `DISCORD_CLIENT_ID=${opts.clientId ?? ''}`,
      `DISCORD_GUILD_ID=${opts.guildIds?.[0] ?? ''}`,
      `BOT_OWNER_IDS=`,
      `LOG_CHANNEL_ID=`,
      `DJSKIT_COMPONENT_SECRET=`,
    ].join('\n') + '\n'
  );
}

/** Resolves final options, running the interactive flow when needed. */
async function resolveOptions(initial: Partial<CreateOptions>): Promise<CreateOptions | null> {
  const complete = initial.name && initial.lang && initial.db && initial.prefix !== undefined;
  const interactive = process.stdout.isTTY && !complete;
  if (interactive) return runCreateFlow(initial);

  if (!complete) {
    console.error(
      pc.red(
        'Non-interactive mode requires --lang, --db, and --prefix (use "" for slash-only). Run with no flags for the interactive flow.',
      ),
    );
    process.exit(1);
  }
  return {
    name: initial.name!,
    lang: initial.lang!,
    db: initial.db!,
    prefix: initial.prefix!,
    guildIds: initial.guildIds ?? [],
    token: initial.token,
    clientId: initial.clientId,
    install: initial.install ?? true,
    git: initial.git ?? false,
    targetDir: initial.targetDir,
  };
}

/** Creates the project on disk: writes files, optionally installs + git inits. */
export async function handleCreate(opts: CreateOptions): Promise<void> {
  const targetDir = opts.targetDir ?? join(process.cwd(), opts.name);

  if (
    existsSync(targetDir) &&
    statSync(targetDir).isDirectory() &&
    readdirSync(targetDir).length > 0
  ) {
    throw new Error(`Target directory ${targetDir} is not empty.`);
  }

  const files = generateFiles(opts);
  writeFiles(targetDir, files);

  // Record framework-managed files + their hashes so `update` can regenerate
  // them safely without clobbering user edits.
  const managedFiles: Record<string, string> = {};
  for (const file of generateManagedFiles(opts)) {
    managedFiles[file.path] = hashContent(file.content);
  }
  writeManifest(targetDir, {
    framework: 'adjskit',
    version: 1,
    lang: opts.lang,
    db: opts.db,
    prefix: opts.prefix,
    managedFiles,
  });

  if (opts.token || opts.clientId || (opts.guildIds && opts.guildIds.length > 0)) {
    writeFile(targetDir, '.env', envFile(opts));
  }
  writeFile(targetDir, '.env.example', envExample(opts));

  console.log(pc.green(`\n  Created ${opts.name} in ${targetDir}\n`));

  if (opts.install) {
    console.log(pc.cyan('  Installing dependencies…\n'));
    execFileSync('npm', ['install'], { cwd: targetDir, stdio: 'inherit' });
  }

  if (opts.git) gitInit(targetDir);

  console.log(
    pc.green(`\n  Done. Next:\n    cd ${opts.name}\n    npm run dev\n`),
    `\n  Framework files are managed via ${pc.cyan(MANIFEST_FILE)} — run ${pc.cyan('adjskit update')} to refresh them.\n`,
  );
}

/** Commander action entry point. */
export async function runCreateCommand(initial: Partial<CreateOptions>): Promise<void> {
  const opts = await resolveOptions(initial);
  if (!opts) return;
  await handleCreate(opts);
}
