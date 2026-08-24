---
layout: home

hero:
  name: adjskit
  text: One handler. Every command style.
  tagline: A discord.js v14 framework with unified slash + prefix commands, signed components, typed events, cooldowns, and database presets. Your project keeps only the handlers.
  actions:
    - theme: brand
      text: Read the docs
      link: /docs/
    - theme: alt
      text: Getting started
      link: /docs/guides/getting-started

features:
  - title: Unified commands
    details: Write once, run as slash, prefix, or both — with typed arguments parsed identically from either source.
    link: /docs/guides/commands
  - title: Signed components
    details: Buttons, dropdowns, and Components v2 modals carry params through compact HMAC-signed custom ids.
    link: /docs/handbook/signed-custom-ids
  - title: Typed events
    details: Event names are keyof ClientEvents, so listener arguments are fully typed. Once-only listeners in one call.
    link: /docs/guides/events
  - title: Cooldowns built in
    details: Per-command cooldowns over memory, file, sqlite, postgres, mysql, mongo, or redis — with live timestamps.
    link: /docs/handbook/cooldowns
  - title: Your words everywhere
    details: Every guard, parse, and error message is overridable via defineConfig with variable placeholders.
    link: /docs/guides/config
  - title: Database presets
    details: Pick none, file, sqlite, postgres, mysql, mongo, or redis at scaffold time — schema and queries generated.
    link: /docs/guides/database
---
