---
title: Databases
description: database, sqlite, postgres, mysql, mongo, redis, drizzle, cooldowns
---

# Databases

Pick a preset at scaffold time. Cooldowns are **automatically** added to the schema + queries for every preset — no extra work.

| Preset     | Backend   | Generated files                                                            |
| ---------- | --------- | -------------------------------------------------------------------------- |
| `none`     | in-memory | —                                                                          |
| `file`     | JSON file | `data/cooldowns.json`                                                      |
| `sqlite`   | Drizzle   | `src/db/index.ts`, `schema.ts`, `queries/cooldown.ts`, `drizzle.config.ts` |
| `postgres` | Drizzle   | `src/db/index.ts`, `schema.ts`, `queries/cooldown.ts`, `drizzle.config.ts` |
| `mysql`    | Drizzle   | `src/db/index.ts`, `schema.ts`, `queries/cooldown.ts`, `drizzle.config.ts` |
| `mongo`    | Mongoose  | `src/db/index.ts`, `schema.ts`                                             |
| `redis`    | ioredis   | `src/db/index.ts`                                                          |

Drizzle presets get `db:generate`, `db:migrate`, and `db:studio` scripts. The cooldown table is created automatically at startup (and also defined in `schema.ts` for migrations).

## Drizzle

```bash
npm run db:generate # generate a migration from src/db/schema
npm run db:migrate  # apply migrations
npm run db:studio   # inspect the DB
```

`src/db/queries/cooldown.ts` implements a `CooldownRecordStore` (one unified implementation for all three dialects) that the bot wires into the cooldown store:

```ts
const cooldowns = await createCooldownStore(config.cooldownBackend, {
  recordStore: cooldownStore,
});
```

## Mongoose

`src/db/schema.ts` defines the `Cooldown` model; the bot connects and passes the model:

```ts
const cooldowns = await createCooldownStore(config.cooldownBackend, {
  mongoose: CooldownModel,
});
```

## Redis

Redis uses native TTL, so no cleanup pass is needed:

```ts
const cooldowns = await createCooldownStore(config.cooldownBackend, {
  redis: redisClient,
});
```

The library consumes all db clients **structurally** — no heavy database dependencies are forced onto `@adjskit/core`.
