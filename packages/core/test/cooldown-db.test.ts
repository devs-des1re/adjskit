import { describe, it, expect, vi } from 'vitest';
import {
  createCooldownStore,
  RecordBackedCooldownStore,
  MongooseCooldownStore,
  RedisCooldownStore,
  type CooldownRecordStore,
  type MongooseCooldownModel,
  type RedisLike,
} from '../src/index.js';

// --- In-memory fakes implementing the decoupled client interfaces ---

class FakeRecordStore implements CooldownRecordStore {
  private map = new Map<string, number>();
  cleanupCalls = 0;

  private k(key: string, userId: string) {
    return `${key}:${userId}`;
  }

  async getExpiry(key: string, userId: string): Promise<number | null> {
    return this.map.get(this.k(key, userId)) ?? null;
  }
  async upsert(key: string, userId: string, expiry: number): Promise<void> {
    this.map.set(this.k(key, userId), expiry);
  }
  async remove(key: string, userId: string): Promise<void> {
    this.map.delete(this.k(key, userId));
  }
  async cleanup(): Promise<void> {
    this.cleanupCalls++;
    const now = Date.now();
    for (const [k, exp] of this.map) if (exp <= now) this.map.delete(k);
  }
}

class FakeMongooseModel implements MongooseCooldownModel {
  private docs = new Map<string, { expiry: number }>();
  private k(key: string, userId: string) {
    return `${key}:${userId}`;
  }

  async findOne(filter: Record<string, unknown>) {
    return this.docs.get(this.k(String(filter.key), String(filter.userId))) ?? null;
  }
  async updateOne(filter: Record<string, unknown>, update: Record<string, unknown>) {
    const doc = this.docs.get(this.k(String(filter.key), String(filter.userId)));
    const expiry = (update as { $set: { expiry: number } }).$set.expiry;
    this.docs.set(this.k(String(filter.key), String(filter.userId)), { expiry });
    return doc ? { modifiedCount: 1 } : { upsertedCount: 1 };
  }
  async deleteOne(filter: Record<string, unknown>) {
    this.docs.delete(this.k(String(filter.key), String(filter.userId)));
    return { deletedCount: 1 };
  }
  async deleteMany(filter: Record<string, unknown>) {
    const cutoff = (filter as { expiry: { $lt: number } }).expiry.$lt;
    let n = 0;
    for (const [k, doc] of this.docs) {
      if (doc.expiry < cutoff) {
        this.docs.delete(k);
        n++;
      }
    }
    return { deletedCount: n };
  }
}

class FakeRedisClient implements RedisLike {
  private map = new Map<string, string>();
  setex = vi.fn(async (key: string, value: string, _ttl: number) => {
    this.map.set(key, value);
  });
  async get(key: string) {
    return this.map.get(key) ?? null;
  }
  del = vi.fn(async (key: string) => {
    this.map.delete(key);
    return 1;
  });
}

describe('RecordBackedCooldownStore', () => {
  it('reports 0 when no record exists', async () => {
    const store = new RecordBackedCooldownStore(new FakeRecordStore());
    expect(await store.check('ban', 'u')).toBe(0);
  });

  it('sets and reports remaining ms, then clears on expiry', async () => {
    const records = new FakeRecordStore();
    const store = new RecordBackedCooldownStore(records);
    await store.set('ban', 'u', 10_000);
    const left = await store.check('ban', 'u');
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThanOrEqual(10_000);

    // simulate expiry by shifting the stored timestamp into the past
    await records.upsert('ban', 'u', Date.now() - 1);
    expect(await store.check('ban', 'u')).toBe(0);
  });

  it('delegates cleanup to the record store', async () => {
    const records = new FakeRecordStore();
    const store = new RecordBackedCooldownStore(records);
    await store.cleanup();
    expect(records.cleanupCalls).toBe(1);
  });
});

describe('MongooseCooldownStore', () => {
  it('persists and retrieves cooldowns through a mongoose-like model', async () => {
    const model = new FakeMongooseModel();
    const records = new MongooseCooldownStore(model);

    expect(await records.getExpiry('ban', 'u')).toBeNull();
    await records.upsert('ban', 'u', Date.now() + 10_000);
    const exp = await records.getExpiry('ban', 'u');
    expect(exp).toBeGreaterThan(Date.now());
    await records.remove('ban', 'u');
    expect(await records.getExpiry('ban', 'u')).toBeNull();
  });

  it('cleanup removes expired records via deleteMany', async () => {
    const model = new FakeMongooseModel();
    const records = new MongooseCooldownStore(model);
    await records.upsert('ban', 'u', Date.now() - 1);
    await records.cleanup();
    expect(await records.getExpiry('ban', 'u')).toBeNull();
  });
});

describe('RedisCooldownStore', () => {
  it('uses SETEX with a TTL and reports remaining ms via the stored expiry', async () => {
    const redis = new FakeRedisClient();
    const store = new RedisCooldownStore(redis);

    await store.set('ban', 'u', 10_000);
    expect(redis.setex).toHaveBeenCalledWith(
      `adjskit:cd:ban:u`,
      expect.any(String),
      Math.ceil(10_000 / 1000),
    );
    const left = await store.check('ban', 'u');
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThanOrEqual(10_000);
  });

  it('reports 0 and deletes when the key is gone', async () => {
    const redis = new FakeRedisClient();
    const store = new RedisCooldownStore(redis);
    expect(await store.check('ban', 'u')).toBe(0);
  });
});

describe('createCooldownStore (database backends)', () => {
  it('constructs a record-backed store for mongo', async () => {
    const store = await createCooldownStore('mongo', { mongoose: new FakeMongooseModel() });
    await store.set('ban', 'u', 10_000);
    expect(await store.check('ban', 'u')).toBeGreaterThan(0);
  });

  it('constructs a redis store', async () => {
    const store = await createCooldownStore('redis', { redis: new FakeRedisClient() });
    await store.set('ban', 'u', 10_000);
    expect(await store.check('ban', 'u')).toBeGreaterThan(0);
  });

  it('constructs a record-backed store for sqlite via a recordStore', async () => {
    const store = await createCooldownStore('sqlite', { recordStore: new FakeRecordStore() });
    await store.set('ban', 'u', 10_000);
    expect(await store.check('ban', 'u')).toBeGreaterThan(0);
  });

  it('works identically for postgres and mysql via a recordStore', async () => {
    for (const backend of ['postgres', 'mysql'] as const) {
      const store = await createCooldownStore(backend, { recordStore: new FakeRecordStore() });
      await store.set('cmd', 'u', 10_000);
      expect(await store.check('cmd', 'u')).toBeGreaterThan(0);
    }
  });
});
