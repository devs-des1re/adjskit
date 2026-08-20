import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { logger } from '../logger/index.js';
import type { CooldownBackend } from '../types.js';
import type { CooldownRecordStore, MongooseCooldownModel, RedisLike } from './db.js';
import { MongooseCooldownStore, RecordBackedCooldownStore, RedisCooldownStore } from './db.js';

export type { CooldownRecordStore, MongooseCooldownModel, RedisLike } from './db.js';
export { MongooseCooldownStore, RecordBackedCooldownStore, RedisCooldownStore } from './db.js';

/**
 * Abstraction over cooldown persistence. Backends implement the same three
 * operations so the command handler is backend-agnostic. Database-backed
 * adapters (sqlite/postgres/mysql/mongo/redis) are wired up in Phase 5.
 */
export interface CooldownStore {
  /** Returns milliseconds remaining on the cooldown, or 0 when none. */
  check(key: string, userId: string): Promise<number>;
  /** Sets a cooldown of `durationMs` for `userId` under `key`. */
  set(key: string, userId: string, durationMs: number): Promise<void>;
  /** Removes expired entries (best-effort; no-op for memory-only backends). */
  cleanup(): Promise<void>;
}

function compositeKey(key: string, userId: string): string {
  return `${key}:${userId}`;
}

/**
 * In-process cooldown store. Entries live only for the process lifetime and
 * are not shared across shards. The default backend.
 */
export class MemoryCooldownStore implements CooldownStore {
  private readonly expiries = new Map<string, number>();

  async check(key: string, userId: string): Promise<number> {
    const exp = this.expiries.get(compositeKey(key, userId));
    if (!exp) return 0;
    const left = exp - Date.now();
    if (left <= 0) {
      this.expiries.delete(compositeKey(key, userId));
      return 0;
    }
    return left;
  }

  async set(key: string, userId: string, durationMs: number): Promise<void> {
    this.expiries.set(compositeKey(key, userId), Date.now() + durationMs);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [k, exp] of this.expiries) {
      if (exp <= now) this.expiries.delete(k);
    }
  }
}

/**
 * JSON-file-backed cooldown store. Keeps an in-memory mirror for fast reads
 * and persists on every `set`. Survives restarts and is suitable for a single
 * process / shared filesystem.
 */
export class FileCooldownStore implements CooldownStore {
  private readonly expiries = new Map<string, number>();

  constructor(private readonly filePath: string) {
    this.load();
  }

  private load(): void {
    if (!existsSync(this.filePath)) return;
    try {
      const raw = readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, number>;
      const now = Date.now();
      for (const [k, exp] of Object.entries(parsed)) {
        if (typeof exp === 'number' && exp > now) this.expiries.set(k, exp);
      }
    } catch (err) {
      logger.warn(`Failed to load cooldown file at ${this.filePath}; starting empty.`, err);
    }
  }

  private persist(): void {
    try {
      mkdirSync(dirname(this.filePath), { recursive: true });
      const obj: Record<string, number> = {};
      for (const [k, exp] of this.expiries) obj[k] = exp;
      writeFileSync(this.filePath, JSON.stringify(obj));
    } catch (err) {
      logger.error(`Failed to persist cooldown file at ${this.filePath}.`, err);
    }
  }

  async check(key: string, userId: string): Promise<number> {
    const exp = this.expiries.get(compositeKey(key, userId));
    if (!exp) return 0;
    const left = exp - Date.now();
    if (left <= 0) {
      this.expiries.delete(compositeKey(key, userId));
      this.persist();
      return 0;
    }
    return left;
  }

  async set(key: string, userId: string, durationMs: number): Promise<void> {
    this.expiries.set(compositeKey(key, userId), Date.now() + durationMs);
    this.persist();
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    let changed = false;
    for (const [k, exp] of this.expiries) {
      if (exp <= now) {
        this.expiries.delete(k);
        changed = true;
      }
    }
    if (changed) this.persist();
  }
}

export interface CooldownStoreOptions {
  /** File path for the `file` backend. Default `data/cooldowns.json`. */
  filePath?: string;
  /** Mongoose Cooldown model for the `mongo` backend. */
  mongoose?: MongooseCooldownModel;
  /** Redis client for the `redis` backend. */
  redis?: RedisLike;
  /**
   * A {@link CooldownRecordStore} for the Drizzle backends (`sqlite`/`postgres`/
   * `mysql`). The generated `db/queries/cooldown.ts` implements this against
   * the project's drizzle client.
   */
  recordStore?: CooldownRecordStore;
}

/**
 * Creates the cooldown store matching the configured backend. `none` is
 * normalized to an in-memory store. Database backends require their
 * corresponding client/record-store to be passed in `options`:
 *  - `mongo`                       → `options.mongoose` (the Cooldown model)
 *  - `redis`                       → `options.redis` (the redis client)
 *  - `sqlite`/`postgres`/`mysql`   → `options.recordStore` (a CooldownRecordStore)
 */
export async function createCooldownStore(
  backend: CooldownBackend,
  options: CooldownStoreOptions = {},
): Promise<CooldownStore> {
  switch (backend) {
    case 'memory':
    case 'none':
      return new MemoryCooldownStore();
    case 'file':
      return new FileCooldownStore(options.filePath ?? 'data/cooldowns.json');
    case 'mongo': {
      if (!options.mongoose) {
        throw new Error('Cooldown backend "mongo" requires options.mongoose (the Cooldown model).');
      }
      return new RecordBackedCooldownStore(new MongooseCooldownStore(options.mongoose));
    }
    case 'redis': {
      if (!options.redis) {
        throw new Error('Cooldown backend "redis" requires options.redis (the redis client).');
      }
      return new RedisCooldownStore(options.redis);
    }
    case 'sqlite':
    case 'postgres':
    case 'mysql': {
      if (!options.recordStore) {
        throw new Error(
          `Cooldown backend "${backend}" requires options.recordStore (a CooldownRecordStore from db/queries/cooldown).`,
        );
      }
      return new RecordBackedCooldownStore(options.recordStore);
    }
    default:
      throw new Error(`Unknown cooldown backend "${backend}".`);
  }
}
