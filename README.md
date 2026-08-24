# adjskit

[![CI](https://github.com/devs-des1re/adjskit/actions/workflows/ci.yml/badge.svg)](https://github.com/devs-des1re/adjskit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@adjskit/core.svg?logo=npm&label=%40adjskit%2Fcore)](https://www.npmjs.com/package/@adjskit/core)
[![npm](https://img.shields.io/npm/v/adjskit.svg?logo=npm&label=adjskit%20CLI)](https://www.npmjs.com/package/adjskit)
[![discord.js](https://img.shields.io/badge/discord.js-%5E14.16-5865F2?logo=discord&logoColor=white)](https://discord.js.org)
[![node](https://img.shields.io/node/v/%40adjskit/core.svg?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?logo=prettier&logoColor=white)](https://prettier.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A batteries-included framework and scaffolding CLI for building [discord.js](https://discord.js.org) v14 bots — unified prefix & slash commands, interactive components with safe custom ids, database-backed cooldowns, and fully customizable error messages.

## Packages

| Package                          | Description                                                |
| -------------------------------- | ---------------------------------------------------------- |
| [`@adjskit/core`](packages/core) | Runtime framework: commands, components, events, cooldowns |
| [`adjskit`](packages/cli)        | CLI to scaffold, extend, and maintain bot projects         |

## Features

- **Unified commands** — write once, run as slash _and_ prefix commands (`setType('both')`), with typed arguments (`user`, `role`, `channel`, `integer`, …) parsed consistently across both sources.
- **Interactive components** — buttons, dropdowns (string/user/role/channel/mentionable selects), and Components v2 modals (text inputs, text displays, string selects, radio groups, image uploads).
- **Compact signed custom ids** — positional params are base36-encoded into custom ids, with optional HMAC signing, expiry, and user/guild scoping baked in.
- **Cooldowns anywhere** — memory, file, sqlite, postgres, mysql, mongo, or redis backends behind one interface; cooldown replies render live `<t:…:R>` timestamps.
- **Customizable errors** — every guard/parse/runtime message overridable via `defineConfig({ messages })` with `{variable}` placeholders.
- **Project tooling** — `adjskit create/add/update/env/doctor/sync` keeps generated files in sync while respecting your own edits.

## Quick start

```bash
npx adjskit@latest create my-bot
cd my-bot
cp .env.example .env   # DISCORD_TOKEN, DISCORD_CLIENT_ID, ...
npm run dev
```

## Example

```ts
import { createCommand, ParamType } from '@adjskit/core';

export default createCommand('ban')
  .setDescription('Ban a member')
  .setModule('moderation')
  .addParam('user', ParamType.User, { required: true })
  .addParam('reason', ParamType.String, { rest: true })
  .setCooldown({ minutes: 5 })
  .setExecute(async (ctx, _ictx, args) => {
    await ctx.reply(`Banned <@${args.user.id}> (${args.reason})`);
  });
```

Buttons carry typed params through the custom id:

```ts
import { createButton } from '@adjskit/core';

export default createButton('confirm_ban')
  .addParam('targetId')
  .setExecute(async (interaction, args) => {
    await interaction.reply(`Banned <@${args.targetId}>`);
  });
```

## Development

```bash
pnpm install
pnpm build       # build all packages
pnpm test        # run every package's tests
pnpm lint        # eslint (flat config)
pnpm typecheck   # tsc --noEmit
pnpm format      # prettier
pnpm smoke       # scaffold a local bot wired to the built core
```

## Documentation

Full documentation lives at **[devs-des1re.github.io/adjskit](https://devs-des1re.github.io/adjskit/)** — [commands](https://devs-des1re.github.io/adjskit/docs/guides/commands/), [components](https://devs-des1re.github.io/adjskit/docs/guides/components/), [events](https://devs-des1re.github.io/adjskit/docs/guides/events/), [configuration](https://devs-des1re.github.io/adjskit/docs/guides/config/), [databases](https://devs-des1re.github.io/adjskit/docs/guides/database/), and the [CLI reference](https://devs-des1re.github.io/adjskit/docs/cli/).

The site is built with [Krate](https://kratejs.pages.dev) from [`site/`](site) and deploys automatically to GitHub Pages on pushes that touch `site/**`. To work on it locally:

```bash
pnpm install
pnpm --filter @adjskit/site dev    # http://localhost:3000
```

## License

[MIT](LICENSE) © Arjun Patel
