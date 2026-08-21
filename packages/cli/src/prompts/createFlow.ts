import * as p from '@clack/prompts';
import { DATABASE_PRESETS, type CreateOptions, type DatabasePreset, type Lang } from '../types.js';

function bail(message = 'Cancelled.'): null {
  p.cancel(message);
  return null;
}

/** Runs the interactive create flow, filling in any options not supplied via flags. */
export async function runCreateFlow(
  initial: Partial<CreateOptions>,
): Promise<CreateOptions | null> {
  p.intro('adjskit — scaffold a discord.js bot');

  const name =
    initial.name ??
    (await p.text({
      message: 'Project name?',
      placeholder: 'my-bot',
      validate: (v) => ((v ?? '').trim().length === 0 ? 'A project name is required.' : undefined),
    }));
  if (p.isCancel(name)) return bail();
  const cleanName = String(name).trim();

  const lang =
    initial.lang ??
    (await p.select<Lang>({
      message: 'Language?',
      options: [
        { value: 'ts', label: 'TypeScript' },
        { value: 'js', label: 'JavaScript' },
      ],
    }));
  if (p.isCancel(lang)) return bail();

  const db =
    initial.db ??
    (await p.select<DatabasePreset>({
      message: 'Database / cooldown preset?',
      options: DATABASE_PRESETS.map((preset) => ({ value: preset, label: preset })),
    }));
  if (p.isCancel(db)) return bail();

  const prefixInput =
    initial.prefix === undefined
      ? await p.text({
          message: 'Command prefix? (leave empty for slash-only)',
          placeholder: '!',
          defaultValue: '!',
        })
      : null;
  if (prefixInput !== null && p.isCancel(prefixInput)) return bail();
  const prefix = initial.prefix ?? (prefixInput === '' ? null : String(prefixInput || '!'));

  const install =
    initial.install ?? (await p.confirm({ message: 'Install dependencies?', initialValue: true }));
  if (p.isCancel(install)) return bail();

  const git = initial.git ?? (await p.confirm({ message: 'Initialize git?', initialValue: true }));
  if (p.isCancel(git)) return bail();

  const guildIds = initial.guildIds ?? [];

  p.outro('Scaffolding…');
  return {
    name: cleanName,
    lang,
    db,
    prefix,
    guildIds,
    token: initial.token,
    clientId: initial.clientId,
    install,
    git,
    targetDir: initial.targetDir,
  };
}
