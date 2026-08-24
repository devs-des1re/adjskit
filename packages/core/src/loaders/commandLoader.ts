import { readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { logger } from '../logger/index.js';
import type { AdjskClient } from '../client.js';
import type { CommandDescriptor } from '../descriptors.js';
import { normalizeDescriptor } from './normalize.js';

/** Extensions treated as loadable command files. */
const VALID_EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'];

function isCommandFile(relativePath: string): boolean {
  if (!VALID_EXTENSIONS.includes(extname(relativePath).toLowerCase())) return false;
  const fileName = relativePath.split(/[\\/]/).pop() ?? '';
  return !fileName.startsWith('_');
}

function listCommandFiles(dir: string): string[] {
  let relative: string[] = [];
  try {
    relative = readdirSync(dir, { recursive: true, withFileTypes: false }) as string[];
  } catch (err) {
    logger.warn(`Commands directory not found or unreadable: ${dir}`, err);
    return [];
  }
  return relative.filter(isCommandFile).map((rel) => join(dir, rel));
}

/**
 * Dynamically imports every command file under `dir` and registers the
 * resulting {@link CommandDescriptor} (the file's default export) into the
 * client collections. Slash/both commands populate `slashCommands`; prefix/both
 * commands populate `prefixCommands` (keyed by name plus each alias).
 *
 * Files prefixed with `_` are skipped. `.ts` files require tsx (dev) or a
 * compiled `.js` build; in production only `.js` remains.
 *
 * @returns the number of commands loaded.
 */
export async function loadCommands(client: AdjskClient, dir = 'src/commands'): Promise<number> {
  const files = listCommandFiles(dir);
  let count = 0;

  for (const file of files) {
    const url = pathToFileURL(file).href;
    let module: { default?: unknown };
    try {
      module = (await import(url)) as { default?: unknown };
    } catch (err) {
      logger.error(`Failed to import command ${file}.`, err);
      continue;
    }

    const descriptor = normalizeDescriptor<CommandDescriptor>(module.default);
    if (!descriptor || typeof descriptor.name !== 'string') {
      logger.warn(`Skipping ${file}: no valid command descriptor (expected a default export).`);
      continue;
    }

    if (descriptor.type === 'slash' || descriptor.type === 'both') {
      client.slashCommands.set(descriptor.name, descriptor);
    }
    if (descriptor.type === 'prefix' || descriptor.type === 'both') {
      client.prefixCommands.set(descriptor.name, descriptor);
      for (const alias of descriptor.aliases) {
        client.prefixCommands.set(alias, descriptor);
      }
    }
    count++;
  }

  logger.info(`Loaded ${count} command(s) from ${dir}.`);
  return count;
}
