import { Command } from 'commander';
import { ADJSKIT_CLI_VERSION } from './version.js';
import { runCreateCommand } from './commands/create.js';
import { handleAdd } from './commands/add.js';
import { handleUpdate } from './commands/update.js';
import { handleDoctor } from './commands/doctor.js';
import { handleEnv } from './commands/env.js';
import { runSync } from './commands/sync.js';
import { DATABASE_PRESETS, type DatabasePreset, type Lang } from './types.js';

const program = new Command();

program
  .name('adjskit')
  .description('Scaffold and manage discord.js bots built on @adjskit/core.')
  .version(ADJSKIT_CLI_VERSION);

program
  .command('create <name>')
  .description('Scaffold a new discord.js bot project')
  .option('--lang <ts|js>', 'output language (ts or js)')
  .option('--db <preset>', `database preset: ${DATABASE_PRESETS.join('|')}`)
  .option('--prefix <prefix>', 'command prefix (use "" for slash-only)')
  .option('--guild-id <id>', 'guild id to register commands to')
  .option('--token <token>', 'bot token (written to .env)')
  .option('--client-id <id>', 'bot application/client id (written to .env)')
  .option('--no-install', 'skip running npm install after scaffolding')
  .option('--git', 'initialize a git repository')
  .action(
    async (
      name: string,
      opts: {
        lang?: string;
        db?: string;
        prefix?: string;
        guildId?: string;
        token?: string;
        clientId?: string;
        install: boolean;
        git?: boolean;
      },
    ) => {
      const lang: Lang | undefined =
        opts.lang === 'ts' || opts.lang === 'js' ? opts.lang : undefined;
      const db: DatabasePreset | undefined =
        opts.db && (DATABASE_PRESETS as readonly string[]).includes(opts.db)
          ? (opts.db as DatabasePreset)
          : undefined;
      const prefix =
        opts.prefix !== undefined ? (opts.prefix === '' ? null : opts.prefix) : undefined;

      await runCreateCommand({
        name,
        lang,
        db,
        prefix,
        guildIds: opts.guildId ? [opts.guildId] : [],
        token: opts.token,
        clientId: opts.clientId,
        install: opts.install,
        git: opts.git ?? false,
      });
    },
  );

const add = program
  .command('add')
  .description('Generate a new command or component file inside an adjskit project');

add
  .command('command <name>')
  .description('Generate a command file. <name> accepts paths like moderation/ban')
  .action((name: string) => handleAdd('command', name));
add
  .command('event <name>')
  .description('Generate an event file. <name> accepts paths like guild/memberAdd')
  .action((name: string) => handleAdd('event', name));
add
  .command('button <name>')
  .description('Generate a button component file')
  .action((name: string) => handleAdd('button', name));
add
  .command('modal <name>')
  .description('Generate a modal component file')
  .action((name: string) => handleAdd('modal', name));
add
  .command('dropdown <name>')
  .description('Generate a dropdown (select menu) component file')
  .action((name: string) => handleAdd('dropdown', name));

program
  .command('update')
  .description('Refresh framework-managed files and bump @adjskit/core')
  .option('--force', 'overwrite user-modified managed files')
  .option('--dry-run', 'show what would change without writing')
  .option('--no-install', 'skip running npm install')
  .action(async (opts: { force?: boolean; dryRun?: boolean; install: boolean }) => {
    await handleUpdate({ force: opts.force, dryRun: opts.dryRun, install: opts.install });
  });

program
  .command('doctor')
  .description('Inspect an adjskit project for configuration issues')
  .action(() => handleDoctor());

program
  .command('env')
  .description('Print required environment variable names')
  .action(() => handleEnv());

program
  .command('sync')
  .description('Register slash commands without starting the bot')
  .action(async () => {
    await runSync();
  });

await program.parseAsync();
