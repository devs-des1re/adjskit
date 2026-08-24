---
title: Project anatomy
description: project structure, files, managed files, update, sync, scripts
---

# Project anatomy

A generated project contains **only your handlers** — every type, builder, and helper lives in `@adjskit/core`. Here is what scaffolding produces:

```txt
my-bot/
├── src/
│   ├── index.ts            # entry point (managed)
│   ├── config.ts           # defineConfig + env (yours)
│   ├── commands/           # one file per command (yours)
│   ├── events/             # one file per event (yours)
│   ├── buttons/            # buttons (yours)
│   ├── dropdowns/          # select menus (yours)
│   ├── modals/             # modals (yours)
│   └── db/                 # only with a database preset
│       ├── index.ts
│       ├── schema.ts
│       └── queries/
├── scripts/
│   └── syncCommands.ts     # slash registration (managed)
├── .env.example            # managed
├── tsconfig.json           # or jsconfig.json (managed)
├── .prettierrc             # managed
├── .gitignore              # managed
└── package.json
```

## Managed vs. yours

Framework-managed files can be regenerated at any time; your handlers, config, and schema are never touched.

| Managed (regenerable)   | Yours (never overwritten)               |
| ----------------------- | --------------------------------------- |
| `src/index`             | `src/commands/**`                       |
| `tsconfig` / `jsconfig` | `src/events/**`                         |
| prettier + gitignore    | `src/buttons/**`, `dropdowns`, `modals` |
| `.env.example`          | `src/config.ts`                         |
| `scripts/syncCommands`  | `src/db/schema.ts`                      |
| db client + query files | anything else you add                   |

Run `npx adjskit update` to refresh managed files **and** bump `@adjskit/core` to the latest version. A managed file that you have modified is skipped — pass `--force` to overwrite it anyway, or `--dry-run` to preview.

## Package scripts

| Script        | Purpose                                           |
| ------------- | ------------------------------------------------- |
| `dev`         | Run the bot with auto-restart on changes          |
| `start`       | Run the bot in production mode                    |
| `db:generate` | Generate a Drizzle migration from `src/db/schema` |
| `db:migrate`  | Apply pending migrations                          |
| `db:studio`   | Open Drizzle Studio                               |

The `db:*` scripts only exist for the drizzle presets (`sqlite`, `postgres`, `mysql`). See [Databases](/docs/guides/database) and [Deploying](/docs/guides/deployment) for production concerns.
