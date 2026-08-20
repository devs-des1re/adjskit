import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, createBot, loadEvents, type AdjskClient } from '../src/index.js';

function env() {
  return { DISCORD_TOKEN: 'mock-token', DISCORD_CLIENT_ID: '123456789012345678' };
}

describe('loadEvents', () => {
  let dir: string;
  let client: AdjskClient;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'adjskit-ev-'));
    client = createBot({ config: defineConfig({ env: env(), prefix: '!' }) });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('groups multiple files for the same event name', async () => {
    writeFileSync(
      join(dir, 'ready.mjs'),
      `export default { name: 'ready', once: true, execute: async () => {} };\n`,
    );
    writeFileSync(
      join(dir, 'readyTwo.mjs'),
      `export default { name: 'ready', once: false, execute: async () => {} };\n`,
    );
    writeFileSync(
      join(dir, 'messageDelete.mjs'),
      `export default { name: 'messageDelete', once: false, execute: async () => {} };\n`,
    );

    const count = await loadEvents(client, dir);
    expect(count).toBe(3);
    expect(client.events.get('ready')).toHaveLength(2);
    expect(client.events.get('messageDelete')).toHaveLength(1);
  });

  it('skips files prefixed with an underscore', async () => {
    writeFileSync(
      join(dir, '_disabled.mjs'),
      `export default { name: 'ready', once: false, execute: async () => {} };\n`,
    );
    const count = await loadEvents(client, dir);
    expect(count).toBe(0);
    expect(client.events.size).toBe(0);
  });

  it('skips files without a valid default export', async () => {
    writeFileSync(join(dir, 'broken.mjs'), `export const notDefault = true;\n`);
    const count = await loadEvents(client, dir);
    expect(count).toBe(0);
  });

  it('returns 0 when the events directory does not exist', async () => {
    const count = await loadEvents(client, join(dir, 'does-not-exist'));
    expect(count).toBe(0);
  });

  it('loads events from subdirectories', async () => {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(join(dir, 'guild'), { recursive: true });
    writeFileSync(
      join(dir, 'guild', 'memberAdd.mjs'),
      `export default { name: 'guildMemberAdd', once: false, execute: async () => {} };\n`,
    );

    const count = await loadEvents(client, dir);
    expect(count).toBe(1);
    expect(client.events.has('guildMemberAdd')).toBe(true);
  });
});
