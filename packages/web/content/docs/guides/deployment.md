---
title: Deploying
description: deploy, production, hosting, pm2, systemd, docker, vps
---

# Deploying your bot

Bots are long-running processes — any VPS, container platform, or home server works.

## 1. Register slash commands once

Slash commands only need to be re-registered when command files change:

```bash
npx adjskit sync
```

## 2. Provide production env

Copy `.env.example` to `.env` on the server (or inject variables through your host) and set at minimum:

```ini
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
```

If you use signed component ids, also set `DJSKIT_COMPONENT_SECRET` to a long random string — components signed in production must be verifiable in production. See [Signed custom ids](/docs/handbook/signed-custom-ids).

## 3. Run it

```bash
npm run start
```

### pm2

```bash
npm install -g pm2
pm2 start dist/index.js --name my-bot   # or tsx src/index.ts
pm2 save && pm2 startup
```

### systemd

```ini
[Unit]
Description=my-bot
After=network-online.target

[Service]
WorkingDirectory=/opt/my-bot
ExecStart=/usr/bin/npm run start
Restart=always
EnvironmentFile=/opt/my-bot/.env

[Install]
WantedBy=multi-user.target
```

### Docker

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "start"]
```

Minimal images may lack build tools for native modules (e.g. `better-sqlite3` used by the sqlite preset); prefer the `mongo`, `redis`, or `postgres` presets inside tiny containers, or install `build-essential` in the image.

## Checklist

- [ ] `npx adjskit sync` after every command change
- [ ] `.env` present with a **production** token and secret
- [ ] Process manager restarts on crash
- [ ] Logs go somewhere persistent — listener errors are caught and logged, not fatal
