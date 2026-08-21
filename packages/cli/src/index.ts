import { Command } from 'commander';
import { ADJSKIT_CLI_VERSION } from './version.js';
import { runCreateCommand } from './commands/create.js';
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

await program.parseAsync();
