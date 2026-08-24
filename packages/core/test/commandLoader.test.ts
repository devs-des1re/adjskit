import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, createBot, loadCommands, type AdjskClient } from '../src/index.js';

function env() {
  return {
    DISCORD_TOKEN: 'mock-token',
    DISCORD_CLIENT_ID: '123456789012345678',
  };
}

describe('loadCommands', () => {
  let dir: string;
  let client: AdjskClient;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'adjskit-cmds-'));
    client = createBot({ config: defineConfig({ env: env(), prefix: '!' }) });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('imports command files and populates both collections', async () => {
    writeFileSync(
      join(dir, 'ping.mjs'),
      `export default { name: 'ping', type: 'both', aliases: ['p'], params: [], execute: async () => {} };\n`,
    );

    const count = await loadCommands(client, dir);
    expect(count).toBe(1);
    expect(client.slashCommands.has('ping')).toBe(true);
    expect(client.prefixCommands.has('ping')).toBe(true);
    expect(client.prefixCommands.has('p')).toBe(true);
  });

  it('registers slash-only commands only in slashCommands', async () => {
    writeFileSync(
      join(dir, 'config.mjs'),
      `export default { name: 'config', type: 'slash', params: [], execute: async () => {} };\n`,
    );

    await loadCommands(client, dir);
    expect(client.slashCommands.has('config')).toBe(true);
    expect(client.prefixCommands.has('config')).toBe(false);
  });

  it('loads commands recursively from subdirectories', async () => {
    mkdirSync(join(dir, 'moderation'), { recursive: true });
    writeFileSync(
      join(dir, 'moderation', 'ban.mjs'),
      `export default { name: 'ban', type: 'both', aliases: [], params: [], execute: async () => {} };\n`,
    );

    const count = await loadCommands(client, dir);
    expect(count).toBe(1);
    expect(client.slashCommands.has('ban')).toBe(true);
  });

  it('skips files prefixed with an underscore', async () => {
    writeFileSync(
      join(dir, '_disabled.mjs'),
      `export default { name: 'disabled', type: 'both', aliases: [], params: [], execute: async () => {} };\n`,
    );

    const count = await loadCommands(client, dir);
    expect(count).toBe(0);
    expect(client.slashCommands.size).toBe(0);
  });

  it('skips files without a valid default export', async () => {
    writeFileSync(join(dir, 'broken.mjs'), `export const notDefault = true;\n`);

    const count = await loadCommands(client, dir);
    expect(count).toBe(0);
  });

  it('returns 0 when the commands directory does not exist', async () => {
    const count = await loadCommands(client, join(dir, 'does-not-exist'));
    expect(count).toBe(0);
  });

  it('loads a file whose default export is a builder (no .build())', async () => {
    writeFileSync(
      join(dir, 'builder.mjs'),
      `export default { build: () => ({ name: 'builderCmd', type: 'both', aliases: [], params: [], execute: async () => {} }) };\n`,
    );
    const count = await loadCommands(client, dir);
    expect(count).toBe(1);
    expect(client.slashCommands.has('builderCmd')).toBe(true);
  });
});
