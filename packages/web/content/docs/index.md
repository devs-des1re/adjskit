---
title: Introduction
description: adjskit, discord.js framework, discord bot
---

# adjskit

A library (`@adjskit/core`) + CLI (`adjskit`) for building **discord.js v14** bots with unified **slash + prefix** commands, components (buttons, modals, dropdowns), events, cooldowns, and database presets.

The generated project contains **only your handlers** — every type, builder, function, and helper lives in the library.

## Quick start

```bash
npx adjskit create my-bot
cd my-bot
# add your bot token / client id to .env, then:
npm run dev
```

The CLI walks you through language (`ts`/`js`), prefix, and database preset. Add flags for non-interactive scaffolding:

```bash
npx adjskit create my-bot --lang ts --db sqlite --prefix '!' --no-install
```

## What's in the box

- **Commands** — one file that works as slash, prefix, or both ([Commands](/docs/guides/commands))
- **Components** — buttons, modals, and dropdowns with compact signed custom ids ([Components](/docs/guides/components))
- **Events** — typed listeners with `once` support ([Events](/docs/guides/events))
- **Config & errors** — `defineConfig` + zod env + customizable messages ([Config](/docs/guides/config))
- **Databases** — none / file / sqlite / postgres / mysql / mongo / redis with automatic cooldowns ([Databases](/docs/guides/database))
- **CLI** — `create`, `add`, `update`, `doctor`, `env`, `sync` ([CLI Reference](/docs/cli))

New here? Start with [Getting started](/docs/guides/getting-started). For the internals — signed ids, cooldown backends, and common gotchas — head to [Advanced](/docs/handbook/signed-custom-ids).
