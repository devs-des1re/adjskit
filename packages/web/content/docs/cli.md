---
title: CLI Reference
description: cli, create, add, update, doctor, env, sync
---

# CLI

The `adjskit` CLI scaffolds and manages projects.

## create

Scaffold a new bot (interactive by default):

```bash
npx adjskit create my-bot
```

Non-interactive flags:

```bash
npx adjskit create my-bot --lang ts --db sqlite --prefix '!' --guild-id 123 --no-install --git
```

- `--lang <ts|js>` — output language
- `--db <none|file|sqlite|postgres|mysql|mongo|redis>` — database preset
- `--prefix <prefix>` — command prefix (use `""` for slash-only)
- `--guild-id`, `--token`, `--client-id` — written to `.env`
- `--no-install`, `--git`

## add

Generate a new handler stub (language auto-detected, nested paths supported):

```bash
npx adjskit add command moderation/ban
npx adjskit add event guildMemberAdd
npx adjskit add button confirm_ban
npx adjskit add modal feedback
npx adjskit add dropdown role_menu
```

## update

Refresh **framework-managed files** (src/index, tsconfig/jsconfig, prettier, gitignore, env.example, sync script, and db files) without touching your commands, components, config, or schema. A managed file is only overwritten if it hasn't been edited; modified files are skipped unless `--force`.

```bash
npx adjskit update # regenerate managed files + bump @adjskit/core + npm install
npx adjskit update --dry-run
npx adjskit update --force  # overwrite modified managed files
npx adjskit update --no-install
```

## doctor

Inspect the project for common issues (missing deps, files, folders, or env values):

```bash
npx adjskit doctor
```

## env

Print the environment variables the project needs:

```bash
npx adjskit env
```

## sync

Register slash commands without starting the bot (runs the generated `scripts/syncCommands`):

```bash
npx adjskit sync
```
