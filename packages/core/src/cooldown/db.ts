import type { CooldownStore } from './store.js';

/**
 * Minimal persistence contract for a cooldown backend. Database adapters only
 * need to implement these three operations (storing epoch-ms expiry
 * timestamps); all the millisecond/expiry logic lives in
 * {@link RecordBackedCooldownStore}, so each adapter stays trivial.
 */
export interface CooldownRecordStore {
  /** Returns the stored expiry (epoch ms) for a key/user, or null when none. */
  getExpiry(key: string, userId: string): Promise<number | null>;
  /** Inserts or replaces the expiry (epoch ms) for a key/user. */
  upsert(key: string, userId: string, expiry: number): Promise<void>;
  /** Removes the stored record for a key/user (e.g. once expired). */
  remove(key: string, userId: string): Promise<void>;
  /** Optional: prune all records whose expiry has passed. */
  cleanup?(): Promise<void>;
}

/**
 * Adapts any {@link CooldownRecordStore} into a {@link CooldownStore},
 * centralizing the cooldown math (ms remaining, auto-removal on expiry, expiry
 * timestamp computation). Used by the Mongoose adapter and by the generated
 * `db/queries/cooldown.ts` for Drizzle-backed (sqlite/postgres/mysql) bots.
 */
export class RecordBackedCooldownStore implements CooldownStore {
  constructor(private readonly records: CooldownRecordStore) {}

  async check(key: string, userId: string): Promise<number> {
    const expiry = await this.records.getExpiry(key, userId);
    if (expiry === null) return 0;
    const left = expiry - Date.now();
    if (left <= 0) {
      await this.records.remove(key, userId);
      return 0;
    }
    return left;
  }

  async set(key: string, userId: string, durationMs: number): Promise<void> {
    await this.records.upsert(key, userId, Date.now() + durationMs);
  }

  async cleanup(): Promise<void> {
    await this.records.cleanup?.();
  }
}

// ---------------------------------------------------------------------------
// Mongoose
// ---------------------------------------------------------------------------

/** Minimal, dialect-free shape of a Mongoose model for cooldowns. */
export interface MongooseCooldownModel {
  findOne(filter: Record<string, unknown>): Promise<{ expiry: number } | null>;
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    opts?: Record<string, unknown>,
  ): Promise<unknown>;
  deleteOne(filter: Record<string, unknown>): Promise<unknown>;
  deleteMany?(filter: Record<string, unknown>): Promise<unknown>;
}

/**
 * Stores cooldowns in MongoDB via a Mongoose model (passed in by the generated
 * project's `db/schema.ts`). No `mongoose` dependency in core — the model is
 * consumed structurally.
 */
export class MongooseCooldownStore implements CooldownRecordStore {
  constructor(private readonly model: MongooseCooldownModel) {}

  async getExpiry(key: string, userId: string): Promise<number | null> {
    const doc = await this.model.findOne({ key, userId });
    return doc?.expiry ?? null;
  }

  async upsert(key: string, userId: string, expiry: number): Promise<void> {
    await this.model.updateOne({ key, userId }, { $set: { expiry } }, { upsert: true });
  }

  async remove(key: string, userId: string): Promise<void> {
    await this.model.deleteOne({ key, userId });
  }

  async cleanup(): Promise<void> {
    await this.model.deleteMany?.({ expiry: { $lt: Date.now() } });
  }
}

// ---------------------------------------------------------------------------
// Redis
// ---------------------------------------------------------------------------

/** Minimal, dialect-free shape of a Redis client for cooldowns. */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  setex(key: string, value: string, ttlSeconds: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

function redisKey(key: string, userId: string): string {
  return `adjskit:cd:${key}:${userId}`;
}

/**
 * Stores cooldowns in Redis using native TTL (`SETEX`), so no cleanup pass is
 * needed — Redis evicts expired keys automatically. The value is the absolute
 * expiry (epoch ms) so `check` can report ms remaining. No `ioredis` /
 * `node-redis` dependency in core — the client is consumed structurally.
 */
export class RedisCooldownStore implements CooldownStore {
  constructor(private readonly client: RedisLike) {}

  async check(key: string, userId: string): Promise<number> {
    const value = await this.client.get(redisKey(key, userId));
    if (!value) return 0;
    const left = Number(value) - Date.now();
    if (left <= 0) {
      await this.client.del(redisKey(key, userId));
      return 0;
    }
    return left;
  }

  async set(key: string, userId: string, durationMs: number): Promise<void> {
    const ttl = Math.max(1, Math.ceil(durationMs / 1000));
    await this.client.setex(redisKey(key, userId), String(Date.now() + durationMs), ttl);
  }

  async cleanup(): Promise<void> {
    // Redis evicts expired keys via TTL; nothing to do.
  }
}
