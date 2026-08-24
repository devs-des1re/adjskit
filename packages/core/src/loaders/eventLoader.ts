import { readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { logger } from '../logger/index.js';
import type { AdjskClient } from '../client.js';
import type { EventDescriptor } from '../descriptors.js';
import { normalizeDescriptor } from './normalize.js';

const VALID_EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'];

function isEventFile(relativePath: string): boolean {
  if (!VALID_EXTENSIONS.includes(extname(relativePath).toLowerCase())) return false;
  const fileName = relativePath.split(/[\\/]/).pop() ?? '';
  return !fileName.startsWith('_');
}

function listEventFiles(dir: string): string[] {
  let relative: string[] = [];
  try {
    relative = readdirSync(dir, { recursive: true, withFileTypes: false }) as string[];
  } catch (err) {
    logger.warn(`Events directory not found or unreadable: ${dir}`, err);
    return [];
  }
  return relative.filter(isEventFile).map((rel) => join(dir, rel));
}

/**
 * Dynamically imports every event file under `dir` and registers the resulting
 * {@link EventDescriptor} (the file's default export) into `client.events`,
 * grouped by event name so multiple listeners can share an event. Files
 * prefixed with `_` are skipped. Returns the number of events loaded.
 */
export async function loadEvents(client: AdjskClient, dir = 'src/events'): Promise<number> {
  const files = listEventFiles(dir);
  let count = 0;

  for (const file of files) {
    const url = pathToFileURL(file).href;
    let module: { default?: unknown };
    try {
      module = (await import(url)) as { default?: unknown };
    } catch (err) {
      logger.error(`Failed to import event ${file}.`, err);
      continue;
    }

    const descriptor = normalizeDescriptor<EventDescriptor>(module.default);
    if (!descriptor || typeof descriptor.name !== 'string') {
      logger.warn(`Skipping ${file}: no valid event descriptor (expected a default export).`);
      continue;
    }

    const existing = client.events.get(descriptor.name) ?? [];
    existing.push(descriptor);
    client.events.set(descriptor.name, existing);
    count++;
  }

  logger.info(`Loaded ${count} event(s) from ${dir}.`);
  return count;
}
