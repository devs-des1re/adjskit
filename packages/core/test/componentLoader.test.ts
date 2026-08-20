import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, createBot, loadComponents, type AdjskClient } from '../src/index.js';

function env() {
  return { DISCORD_TOKEN: 'mock-token', DISCORD_CLIENT_ID: '123456789012345678' };
}

describe('loadComponents', () => {
  let dir: string;
  let client: AdjskClient;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'adjskit-comp-'));
    client = createBot({ config: defineConfig({ env: env(), prefix: '!' }) });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('loads buttons, modals, and dropdowns into their collections', async () => {
    const buttonsDir = join(dir, 'buttons');
    const modalsDir = join(dir, 'modals');
    const dropdownsDir = join(dir, 'dropdowns');
    for (const sub of [buttonsDir, modalsDir, dropdownsDir]) mkdirSync(sub, { recursive: true });

    writeFileSync(
      join(buttonsDir, 'confirm.mjs'),
      `export default { customId: 'confirm', params: ['id'], execute: async () => {} };\n`,
    );
    writeFileSync(
      join(modalsDir, 'form.mjs'),
      `export default { customId: 'form', params: [], fields: [], execute: async () => {} };\n`,
    );
    writeFileSync(
      join(dropdownsDir, 'menu.mjs'),
      `export default { customId: 'menu', params: [], selectType: 'role', execute: async () => {} };\n`,
    );

    const counts = await loadComponents(client, {
      buttons: buttonsDir,
      modals: modalsDir,
      dropdowns: dropdownsDir,
    });
    expect(counts).toEqual({ buttons: 1, modals: 1, dropdowns: 1 });
    expect(client.buttons.has('confirm')).toBe(true);
    expect(client.modals.has('form')).toBe(true);
    expect(client.dropdowns.has('menu')).toBe(true);
  });

  it('skips files without a valid descriptor', async () => {
    writeFileSync(join(dir, 'bad.mjs'), `export default { not: 'a descriptor' };\n`);
    const counts = await loadComponents(client, {
      buttons: dir,
      modals: dir,
      dropdowns: dir,
    });
    expect(counts).toEqual({ buttons: 0, modals: 0, dropdowns: 0 });
  });

  it('returns zero counts when directories do not exist', async () => {
    const counts = await loadComponents(client, {
      buttons: join(dir, 'nope'),
      modals: join(dir, 'nope'),
      dropdowns: join(dir, 'nope'),
    });
    expect(counts).toEqual({ buttons: 0, modals: 0, dropdowns: 0 });
  });
});
