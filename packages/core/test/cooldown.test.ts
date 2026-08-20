import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryCooldownStore, FileCooldownStore, createCooldownStore } from '../src/index.js';

describe('MemoryCooldownStore', () => {
  const store = new MemoryCooldownStore();

  it('reports 0 when no cooldown is set', async () => {
    expect(await store.check('ban', '1')).toBe(0);
  });

  it('reports remaining time after set', async () => {
    await store.set('kick', '2', 10_000);
    const left = await store.check('kick', '2');
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThanOrEqual(10_000);
  });

  it('isolates cooldowns by user', async () => {
    await store.set('cmd', 'a', 10_000);
    expect(await store.check('cmd', 'b')).toBe(0);
  });

  it('returns 0 after expiry', async () => {
    await store.set('exp', 'u', 1);
    await new Promise((r) => setTimeout(r, 10));
    expect(await store.check('exp', 'u')).toBe(0);
  });

  it('cleanup removes expired entries without error', async () => {
    await store.set('gone', 'u', 1);
    await new Promise((r) => setTimeout(r, 10));
    await expect(store.cleanup()).resolves.toBeUndefined();
  });
});

describe('FileCooldownStore', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'adjskit-cd-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('persists cooldowns to a JSON file across instances', async () => {
    const path = join(dir, 'cd.json');
    const s1 = new FileCooldownStore(path);
    await s1.set('ban', 'u', 60_000);
    expect(existsSync(path)).toBe(true);

    const s2 = new FileCooldownStore(path);
    const left = await s2.check('ban', 'u');
    expect(left).toBeGreaterThan(0);
  });

  it('drops expired entries on reload', async () => {
    const path = join(dir, 'cd.json');
    const s1 = new FileCooldownStore(path);
    await s1.set('exp', 'u', 1);
    await new Promise((r) => setTimeout(r, 10));

    const s2 = new FileCooldownStore(path);
    expect(await s2.check('exp', 'u')).toBe(0);
  });
});

describe('createCooldownStore', () => {
  it('creates a memory store for "memory"', async () => {
    expect(await createCooldownStore('memory')).toBeInstanceOf(MemoryCooldownStore);
  });

  it('creates a file store for "file"', async () => {
    const s = await createCooldownStore('file', { filePath: join(tmpdir(), 'adjskit-x.json') });
    expect(s).toBeInstanceOf(FileCooldownStore);
  });

  it('normalizes "none" to memory', async () => {
    expect(await createCooldownStore('none')).toBeInstanceOf(MemoryCooldownStore);
  });

  it('throws for database backends until Phase 5', async () => {
    await expect(createCooldownStore('postgres')).rejects.toThrow(/not implemented/);
  });
});
