import { toJs, ext } from '../utils.js';
import type { CreateOptions, DatabasePreset, Lang, ScaffoldedFile } from '../types.js';

const D = {
  core: '^0.0.0',
  discord: '^14.16.0',
  zod: '^3.24.0',
  dotenv: '^16.4.5',
  drizzleOrm: '^0.36.0',
  drizzleKit: '^0.28.0',
  betterSqlite3: '^11.5.0',
  pg: '^8.13.0',
  mysql2: '^3.11.0',
  mongoose: '^8.8.0',
  ioredis: '^5.4.0',
  typescript: '^5.9.2',
  tsx: '^4.19.0',
  typesNode: '^22.10.0',
  typesBetterSqlite3: '^7.6.0',
  typesPg: '^8.11.0',
  prettier: '^3.4.0',
};

/** The @adjskit/core version the CLI ships (written into generated projects). */
export const CORE_VERSION = D.core;

/** Runtime dependency package names for a db preset (used by doctor). */
export function dbDependencyNames(db: DatabasePreset): string[] {
  return Object.keys(dbDeps(db).deps);
}

/** Renders a TS source file for the target language (transpiled for JS). */
function render(tsSource: string, lang: Lang): string {
  return lang === 'ts' ? tsSource : toJs(tsSource);
}

// ---------------------------------------------------------------------------
// package.json
// ---------------------------------------------------------------------------

function dbDeps(db: DatabasePreset): { deps: Record<string, string>; dev: Record<string, string> } {
  switch (db) {
    case 'sqlite':
      return {
        deps: { 'drizzle-orm': D.drizzleOrm, 'better-sqlite3': D.betterSqlite3 },
        dev: { 'drizzle-kit': D.drizzleKit, '@types/better-sqlite3': D.typesBetterSqlite3 },
      };
    case 'postgres':
      return {
        deps: { 'drizzle-orm': D.drizzleOrm, pg: D.pg },
        dev: { 'drizzle-kit': D.drizzleKit, '@types/pg': D.typesPg },
      };
    case 'mysql':
      return {
        deps: { 'drizzle-orm': D.drizzleOrm, mysql2: D.mysql2 },
        dev: { 'drizzle-kit': D.drizzleKit },
      };
    case 'mongo':
      return { deps: { mongoose: D.mongoose }, dev: {} };
    case 'redis':
      return { deps: { ioredis: D.ioredis }, dev: {} };
    default:
      return { deps: {}, dev: {} };
  }
}

function dbScripts(db: DatabasePreset): Record<string, string> {
  if (db === 'sqlite' || db === 'postgres' || db === 'mysql') {
    return {
      'db:generate': 'drizzle-kit generate',
      'db:migrate': 'drizzle-kit migrate',
      'db:studio': 'drizzle-kit studio',
    };
  }
  return {};
}

export function packageJson(opts: CreateOptions): string {
  const { deps: dbDepMap, dev: dbDevMap } = dbDeps(opts.db);
  const dependencies: Record<string, string> = {
    '@adjskit/core': D.core,
    'discord.js': D.discord,
    zod: D.zod,
    dotenv: D.dotenv,
    ...dbDepMap,
  };
  const devDependencies: Record<string, string> = {
    '@types/node': D.typesNode,
    prettier: D.prettier,
    ...(opts.lang === 'ts' ? { typescript: D.typescript, tsx: D.tsx } : {}),
    ...dbDevMap,
  };
  const scripts: Record<string, string> = {
    dev: opts.lang === 'ts' ? 'tsx watch src/index.ts' : 'node --watch src/index.js',
    start: opts.lang === 'ts' ? 'tsx src/index.ts' : 'node src/index.js',
    format: 'prettier --write .',
    ...dbScripts(opts.db),
  };
  return `${JSON.stringify(
    {
      name: opts.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      version: '0.0.0',
      private: true,
      type: 'module',
      scripts,
      dependencies,
      devDependencies,
      engines: { node: '>=20.12.0' },
    },
    null,
    2,
  )}\n`;
}

// ---------------------------------------------------------------------------
// env, gitignore, prettier, tsconfig/jsconfig
// ---------------------------------------------------------------------------

function dbEnv(db: DatabasePreset): string[] {
  switch (db) {
    case 'sqlite':
      return ['DATABASE_URL=file:./data/db.sqlite'];
    case 'postgres':
      return ['DATABASE_URL=postgresql://user:password@localhost:5432/dbname'];
    case 'mysql':
      return ['DATABASE_URL=mysql://user:password@localhost:3306/dbname'];
    case 'mongo':
      return ['MONGODB_URI=mongodb://localhost:27017/adjskit'];
    case 'redis':
      return ['REDIS_URL=redis://localhost:6379'];
    default:
      return [];
  }
}

export function envExample(opts: CreateOptions): string {
  const lines = [
    '# Discord',
    'DISCORD_TOKEN=',
    'DISCORD_CLIENT_ID=',
    'DISCORD_GUILD_ID=',
    'BOT_OWNER_IDS=',
    'LOG_CHANNEL_ID=',
    'DJSKIT_COMPONENT_SECRET=',
    '',
    '# Cooldown backend: ' + opts.db,
    ...dbEnv(opts.db),
  ];
  return lines.join('\n') + '\n';
}

export function gitignore(): string {
  return [
    'node_modules/',
    'dist/',
    'logs/',
    'data/',
    'drizzle/',
    '.env',
    '*.log',
    '.DS_Store',
    '',
  ].join('\n');
}

export function prettierRc(): string {
  return `${JSON.stringify(
    {
      semi: true,
      singleQuote: true,
      trailingComma: 'all',
      printWidth: 100,
      tabWidth: 2,
      arrowParens: 'always',
      endOfLine: 'lf',
    },
    null,
    2,
  )}\n`;
}

export function prettierIgnore(): string {
  return [
    'node_modules/',
    'dist/',
    'logs/',
    'data/',
    'drizzle/',
    'pnpm-lock.yaml',
    'package-lock.json',
    '',
  ].join('\n');
}

export function tsconfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
        resolveJsonModule: true,
        outDir: 'dist',
        rootDir: 'src',
      },
      include: ['src/**/*.ts'],
      exclude: ['node_modules', 'dist'],
    },
    null,
  )}\n`;
}

export function jsconfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        target: 'ES2022',
        allowJs: true,
        checkJs: false,
        resolveJsonModule: true,
      },
      include: ['src/**/*.js'],
      exclude: ['node_modules'],
    },
    null,
  )}\n`;
}

// ---------------------------------------------------------------------------
// src/config (user-owned)
// ---------------------------------------------------------------------------

function cooldownBackend(db: DatabasePreset): string {
  return db === 'none' ? "'none'" : `'${db}'`;
}

export function configFile(opts: CreateOptions): ScaffoldedFile {
  const dbEnvVar =
    opts.db === 'mongo'
      ? `  MONGODB_URI: z.string().optional(),`
      : opts.db === 'redis'
        ? `  REDIS_URL: z.string().optional(),`
        : opts.db === 'sqlite' || opts.db === 'postgres' || opts.db === 'mysql'
          ? `  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required for the ${opts.db} preset.'),`
          : '';

  const src = `import { defineConfig, defineEnv, defaultEnvSchema, z } from '@adjskit/core';

const envSchema = defaultEnvSchema.extend({
${dbEnvVar}
});

export const env = defineEnv(envSchema);

export const config = defineConfig({
  env,
  prefix: ${opts.prefix === null ? 'null' : `'${opts.prefix}'`},
  cooldownBackend: ${cooldownBackend(opts.db)},
});
`;
  return { path: `src/config${ext(opts.lang)}`, content: render(src, opts.lang) };
}

// ---------------------------------------------------------------------------
// src/index (managed entry)
// ---------------------------------------------------------------------------

function cooldownSection(db: DatabasePreset): { imports: string; body: string } {
  switch (db) {
    case 'none':
    case 'file':
      return {
        imports: '',
        body: 'const cooldowns = await createCooldownStore(config.cooldownBackend);',
      };
    case 'sqlite':
    case 'postgres':
    case 'mysql':
      return {
        imports: `import { init as initCooldowns, cooldownStore } from './db/queries/cooldown.js';`,
        body: `await initCooldowns();
const cooldowns = await createCooldownStore(config.cooldownBackend, { recordStore: cooldownStore });`,
      };
    case 'mongo':
      return {
        imports: `import { CooldownModel, connect as connectDb } from './db/index.js';`,
        body: `await connectDb();
const cooldowns = await createCooldownStore(config.cooldownBackend, { mongoose: CooldownModel });`,
      };
    case 'redis':
      return {
        imports: `import { redisClient, connect as connectDb } from './db/index.js';`,
        body: `await connectDb();
const cooldowns = await createCooldownStore(config.cooldownBackend, { redis: redisClient });`,
      };
  }
}

export function indexFile(opts: CreateOptions): ScaffoldedFile {
  const { imports, body } = cooldownSection(opts.db);
  const src = `import 'dotenv/config';
import {
  createBot,
  createCooldownStore,
  createLogger,
  configureCustomIdCodec,
  defineConfig,
  loadCommands,
  loadComponents,
  loadEvents,
  registerCommandHandler,
  registerComponentHandler,
  registerEventHandlers,
  registerSlashCommands,
} from '@adjskit/core';
import { config } from './config.js';
${imports}

const logger = createLogger({ level: config.logLevel, logDir: 'logs' });
configureCustomIdCodec({ secret: config.componentStateSecret });

const client = createBot({ config });

${body}

await loadEvents(client);
await loadCommands(client);
await loadComponents(client);

registerCommandHandler({ client, config, cooldowns });
registerComponentHandler({ client, config });
registerEventHandlers(client);

client.once('ready', async () => {
  await registerSlashCommands(client, config);
  logger.success(\`Logged in as \${client.user?.tag ?? 'unknown'}\`);
});

await client.login(config.token);
`;
  return { path: `src/index${ext(opts.lang)}`, content: render(src, opts.lang) };
}

// ---------------------------------------------------------------------------
// Example command + event
// ---------------------------------------------------------------------------

export function pingCommand(opts: CreateOptions): ScaffoldedFile {
  const src = `import { createCommand } from '@adjskit/core';

export default createCommand('ping')
  .setDescription('Replies with pong')
  .setType('both')
  .setExecute(async (ctx) => {
    await ctx.reply('Pong!');
  });
`;
  return { path: `src/commands/ping${ext(opts.lang)}`, content: render(src, opts.lang) };
}

export function readyEvent(opts: CreateOptions): ScaffoldedFile {
  const src = `import { createEvent } from '@adjskit/core';

export default createEvent('ready')
  .setOnce()
  .setExecute(async (client) => {
    console.log(\`Logged in as \${client.user?.tag ?? 'unknown'}\`);
  });
`;
  return { path: `src/events/ready${ext(opts.lang)}`, content: render(src, opts.lang) };
}

export function gitkeep(dir: string): ScaffoldedFile {
  return { path: `${dir}/.gitkeep`, content: '' };
}

// ---------------------------------------------------------------------------
// db/ files per preset
// ---------------------------------------------------------------------------

function drizzleIndex(db: 'sqlite' | 'postgres' | 'mysql', lang: Lang): ScaffoldedFile {
  const drivers = {
    sqlite: `import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const url = process.env.DATABASE_URL?.replace(/^file:/, '') ?? './data/db.sqlite';
mkdirSync(dirname(url), { recursive: true });
const sqlite = new Database(url);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite);`,
    postgres: `import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);`,
    mysql: `import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const pool = mysql.createPool(process.env.DATABASE_URL);
export const db = drizzle(pool);`,
  } as const;

  const runAll =
    db === 'sqlite'
      ? `export async function all<T = Record<string, unknown>>(query: SQL): Promise<T[]> {
  return db.all(query) as T[];
}
export async function run(query: SQL): Promise<void> {
  db.run(query);
}`
      : db === 'postgres'
        ? `export async function all<T = Record<string, unknown>>(query: SQL): Promise<T[]> {
  return (await db.execute(query)).rows as T[];
}
export async function run(query: SQL): Promise<void> {
  await db.execute(query);
}`
        : `export async function all<T = Record<string, unknown>>(query: SQL): Promise<T[]> {
  const [rows] = await db.execute(query);
  return rows as T[];
}
export async function run(query: SQL): Promise<void> {
  await db.execute(query);
}`;

  const src = `import 'dotenv/config';
import type { SQL } from 'drizzle-orm';

${drivers[db]}

${runAll}
`;
  return { path: `src/db/index${ext(lang)}`, content: render(src, lang) };
}

function drizzleSchema(db: 'sqlite' | 'postgres' | 'mysql', lang: Lang): ScaffoldedFile {
  const templates = {
    sqlite: `import { sqliteTable, text, integer } from 'drizzle-orm';

export const cooldowns = sqliteTable('adjskit_cooldowns', {
  key: text('key').notNull(),
  userId: text('user_id').notNull(),
  expiry: integer('expiry').notNull(),
});`,
    postgres: `import { pgTable, text, integer } from 'drizzle-orm';

export const cooldowns = pgTable('adjskit_cooldowns', {
  key: text('key').notNull(),
  userId: text('user_id').notNull(),
  expiry: integer('expiry').notNull(),
});`,
    mysql: `import { mysqlTable, text, int } from 'drizzle-orm';

export const cooldowns = mysqlTable('adjskit_cooldowns', {
  key: text('key').notNull(),
  userId: text('user_id').notNull(),
  expiry: int('expiry').notNull(),
});`,
  } as const;
  return { path: `src/db/schema${ext(lang)}`, content: render(templates[db], lang) };
}

function drizzleQueries(lang: Lang): ScaffoldedFile {
  const src = `import { sql } from 'drizzle-orm';
import type { CooldownRecordStore } from '@adjskit/core';
import { all, run } from '../index.js';

let initialized = false;

export async function init(): Promise<void> {
  if (initialized) return;
  await run(
    sql\`CREATE TABLE IF NOT EXISTS adjskit_cooldowns (key TEXT NOT NULL, user_id TEXT NOT NULL, expiry INTEGER NOT NULL, PRIMARY KEY (key, user_id))\`,
  );
  initialized = true;
}

export const cooldownStore: CooldownRecordStore = {
  async getExpiry(key, userId) {
    const rows = await all<{ expiry: number }>(
      sql\`SELECT expiry FROM adjskit_cooldowns WHERE key = \${key} AND user_id = \${userId}\`,
    );
    return rows[0]?.expiry ?? null;
  },
  async upsert(key, userId, expiry) {
    await run(sql\`DELETE FROM adjskit_cooldowns WHERE key = \${key} AND user_id = \${userId}\`);
    await run(sql\`INSERT INTO adjskit_cooldowns (key, user_id, expiry) VALUES (\${key}, \${userId}, \${expiry})\`);
  },
  async remove(key, userId) {
    await run(sql\`DELETE FROM adjskit_cooldowns WHERE key = \${key} AND user_id = \${userId}\`);
  },
  async cleanup() {
    await run(sql\`DELETE FROM adjskit_cooldowns WHERE expiry < \${Date.now()}\`);
  },
};
`;
  return { path: `src/db/queries/cooldown${ext(lang)}`, content: render(src, lang) };
}

function drizzleConfig(db: 'sqlite' | 'postgres' | 'mysql', lang: Lang): ScaffoldedFile {
  const dialect = db === 'postgres' ? 'postgresql' : db;
  const credentials =
    db === 'sqlite'
      ? `url: (process.env.DATABASE_URL ?? 'file:./data/db.sqlite').replace(/^file:/, '')`
      : `url: process.env.DATABASE_URL`;
  const src = `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema${ext(lang)}',
  out: './drizzle',
  dialect: '${dialect}',
  dbCredentials: { ${credentials} },
});
`;
  // drizzle.config stays .ts even for JS projects (drizzle-kit loads it).
  return { path: `drizzle.config.ts`, content: src };
}

function mongoIndex(lang: Lang): ScaffoldedFile {
  const src = `import 'dotenv/config';
import mongoose from 'mongoose';

export { CooldownModel } from './schema.js';

let connected = false;

export async function connect(): Promise<void> {
  if (connected) return;
  await mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/adjskit');
  connected = true;
}
`;
  return { path: `src/db/index${ext(lang)}`, content: render(src, lang) };
}

function mongoSchema(lang: Lang): ScaffoldedFile {
  const src = `import { Schema, model } from 'mongoose';

const cooldownSchema = new Schema({
  key: { type: String, required: true },
  userId: { type: String, required: true },
  expiry: { type: Number, required: true },
});

export const CooldownModel = model('Cooldown', cooldownSchema);
`;
  return { path: `src/db/schema${ext(lang)}`, content: render(src, lang) };
}

function redisIndex(lang: Lang): ScaffoldedFile {
  const src = `import 'dotenv/config';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

export const redisClient = {
  get: (key: string) => redis.get(key),
  setex: (key: string, value: string, ttlSeconds: number) =>
    redis.set(key, value, 'EX', ttlSeconds),
  del: (key: string) => redis.del(key),
};

let connected = false;

export async function connect(): Promise<void> {
  if (connected) return;
  await redis.ping();
  connected = true;
}
`;
  return { path: `src/db/index${ext(lang)}`, content: render(src, lang) };
}

export function dbFiles(opts: CreateOptions): ScaffoldedFile[] {
  const lang = opts.lang;
  switch (opts.db) {
    case 'none':
    case 'file':
      return [];
    case 'sqlite':
    case 'postgres':
    case 'mysql':
      return [
        drizzleIndex(opts.db, lang),
        drizzleSchema(opts.db, lang),
        drizzleQueries(lang),
        drizzleConfig(opts.db, lang),
      ];
    case 'mongo':
      return [mongoIndex(lang), mongoSchema(lang)];
    case 'redis':
      return [redisIndex(lang)];
  }
}

// ---------------------------------------------------------------------------
// Sync script (managed)
// ---------------------------------------------------------------------------

export function syncScript(opts: CreateOptions): ScaffoldedFile {
  const src = `import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { loadCommands, buildApplicationCommandData, AdjskClient } from '@adjskit/core';
import { config } from '../src/config.js';

const client = new AdjskClient({ intents: [] });
await loadCommands(client, 'src/commands');

const data = [...client.slashCommands.values()]
  .filter((desc) => desc.type === 'slash' || desc.type === 'both')
  .map(buildApplicationCommandData);

const rest = new REST({ version: '10' }).setToken(config.token);

if (config.commandRegistration === 'global') {
  await rest.put(Routes.applicationCommands(config.clientId), { body: data });
} else {
  const guilds = config.commandRegistration === 'multiGuild' ? config.guildIds : [config.guildId];
  for (const guildId of guilds) {
    if (!guildId) throw new Error('Missing guild id for command registration.');
    await rest.put(Routes.applicationGuildCommands(config.clientId, guildId), { body: data });
  }
}

console.log(\`Synced \${data.length} command(s).\`);
`;
  return { path: `scripts/syncCommands${ext(opts.lang)}`, content: render(src, opts.lang) };
}

// ---------------------------------------------------------------------------
// Project assembly
// ---------------------------------------------------------------------------

export function generateFiles(opts: CreateOptions): ScaffoldedFile[] {
  return [
    { path: 'package.json', content: packageJson(opts) },
    { path: '.env.example', content: envExample(opts) },
    { path: '.gitignore', content: gitignore() },
    { path: '.prettierrc.json', content: prettierRc() },
    { path: '.prettierignore', content: prettierIgnore() },
    {
      path: opts.lang === 'ts' ? 'tsconfig.json' : 'jsconfig.json',
      content: opts.lang === 'ts' ? tsconfig() : jsconfig(),
    },
    configFile(opts),
    indexFile(opts),
    pingCommand(opts),
    readyEvent(opts),
    syncScript(opts),
    gitkeep('src/buttons'),
    gitkeep('src/modals'),
    gitkeep('src/dropdowns'),
    ...dbFiles(opts),
  ];
}

/** Paths of files the framework owns and `update` may regenerate. */
export function managedFilePaths(opts: CreateOptions): string[] {
  const e = ext(opts.lang);
  const paths = [
    `src/index${e}`,
    opts.lang === 'ts' ? 'tsconfig.json' : 'jsconfig.json',
    '.prettierrc.json',
    '.prettierignore',
    '.env.example',
    '.gitignore',
    `scripts/syncCommands${e}`,
  ];
  switch (opts.db) {
    case 'sqlite':
    case 'postgres':
    case 'mysql':
      paths.push(`src/db/index${e}`, `src/db/queries/cooldown${e}`, 'drizzle.config.ts');
      break;
    case 'mongo':
      paths.push(`src/db/index${e}`, `src/db/schema${e}`);
      break;
    case 'redis':
      paths.push(`src/db/index${e}`);
      break;
    default:
      break;
  }
  return paths;
}

/** Returns only the framework-managed files (subset of {@link generateFiles}). */
export function generateManagedFiles(opts: CreateOptions): ScaffoldedFile[] {
  const managed = new Set(managedFilePaths(opts));
  return generateFiles(opts).filter((file) => managed.has(file.path));
}
