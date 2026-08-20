import { readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { logger } from '../logger/index.js';
import type { AdjskClient } from '../client.js';
import type { ButtonDescriptor, DropdownDescriptor, ModalDescriptor } from '../descriptors.js';

const VALID_EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'];

function isComponentFile(relativePath: string): boolean {
  if (!VALID_EXTENSIONS.includes(extname(relativePath).toLowerCase())) return false;
  const fileName = relativePath.split(/[\\/]/).pop() ?? '';
  return !fileName.startsWith('_');
}

function listFiles(dir: string): string[] {
  let relative: string[] = [];
  try {
    relative = readdirSync(dir, { recursive: true, withFileTypes: false }) as string[];
  } catch (err) {
    logger.warn(`Component directory not found or unreadable: ${dir}`, err);
    return [];
  }
  return relative.filter(isComponentFile).map((rel) => join(dir, rel));
}

async function importDefault(file: string): Promise<{ default?: unknown } | null> {
  try {
    return (await import(pathToFileURL(file).href)) as { default?: unknown };
  } catch (err) {
    logger.error(`Failed to import component ${file}.`, err);
    return null;
  }
}

export interface ComponentDirs {
  buttons?: string;
  modals?: string;
  dropdowns?: string;
}

/**
 * Loads button, modal, and dropdown files from their directories into the
 * client collections. Each file's default export is the component descriptor
 * (the builder's `.build()` result). Files prefixed with `_` are skipped.
 */
export async function loadComponents(
  client: AdjskClient,
  dirs: ComponentDirs = {},
): Promise<{ buttons: number; modals: number; dropdowns: number }> {
  const counts = { buttons: 0, modals: 0, dropdowns: 0 };

  for (const file of listFiles(dirs.buttons ?? 'src/buttons')) {
    const mod = await importDefault(file);
    const desc = mod?.default as ButtonDescriptor | undefined;
    if (!desc || typeof desc.customId !== 'string') {
      logger.warn(`Skipping ${file}: no valid button descriptor.`);
      continue;
    }
    client.buttons.set(desc.customId, desc);
    counts.buttons++;
  }

  for (const file of listFiles(dirs.modals ?? 'src/modals')) {
    const mod = await importDefault(file);
    const desc = mod?.default as ModalDescriptor | undefined;
    if (!desc || typeof desc.customId !== 'string') {
      logger.warn(`Skipping ${file}: no valid modal descriptor.`);
      continue;
    }
    client.modals.set(desc.customId, desc);
    counts.modals++;
  }

  for (const file of listFiles(dirs.dropdowns ?? 'src/dropdowns')) {
    const mod = await importDefault(file);
    const desc = mod?.default as DropdownDescriptor | undefined;
    if (!desc || typeof desc.customId !== 'string') {
      logger.warn(`Skipping ${file}: no valid dropdown descriptor.`);
      continue;
    }
    client.dropdowns.set(desc.customId, desc);
    counts.dropdowns++;
  }

  logger.info(
    `Loaded ${counts.buttons} button(s), ${counts.modals} modal(s), ${counts.dropdowns} dropdown(s).`,
  );
  return counts;
}
