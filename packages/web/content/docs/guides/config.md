---
title: Config & errors
description: config, defineConfig, env, messages, errors
---

# Config & errors

`src/config.ts` (user-owned) is the single source of truth. It uses `defineConfig` plus zod for env validation — everything comes from the library.

```ts
import { defineConfig, defineEnv, defaultEnvSchema, z } from '@adjskit/core';

const envSchema = defaultEnvSchema.extend({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),
});

export const env = defineEnv(envSchema);

export const config = defineConfig({
  env,
  prefix: '!',
  cooldownBackend: 'sqlite',
  messages: {
    commandCooldown: 'Chill out — try again <t:{unix}:R> ({seconds}s left).',
  },
});
```

`defaultEnvSchema` validates `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID(S)`, `BOT_OWNER_IDS`, `LOG_CHANNEL_ID`, `DJSKIT_COMPONENT_SECRET`, and `DISCORD_TOTAL_SHARDS`. Extend it with `z` for app-specific variables.

## Messages

Every surface has a default message template with `{variable}` placeholders. Override any of them in `defineConfig({ messages })`:

- commands — `commandPermissionDenied`, `commandCooldown` (with `{unix}` + `{seconds}`), `commandNotImplemented`, `commandError`, and all the arg errors (`missingRequiredArgument`, `invalidNumber`, `userNotFound`, …)
- components — `componentPermissionDenied`, `componentExpired`, `componentWrongUser`, `componentWrongGuild`, `componentInvalidStateFallback`, `componentError`
- guards — `guardOwnerOnly`, `guardDevOnly`, `guardBlacklisted`, `guardNotAllowed`, `guardMissingRole`

Cooldown messages automatically interpolate `<t:{unix}:R>` so users know exactly when they can run the command again.
