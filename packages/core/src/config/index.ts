import process from 'node:process';
import type { ZodTypeAny } from 'zod';
import { z } from 'zod';
import type {
  CommandRegistrationMode,
  CooldownBackend,
  CooldownDuration,
  LogLevel,
} from '../types.js';

export { z };

/** Re-export zod so generated `config.ts` files can author schemas from core. */
export type { ZodSchema, ZodTypeAny } from 'zod';

/**
 * Default environment schema for the Discord side of a bot. Generated
 * `config.ts` may `extend()` it with database or app-specific variables.
 */
export const defaultEnvSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required. Add it to your .env file.'),
  DISCORD_CLIENT_ID: z
    .string()
    .regex(/^\d{17,19}$/, 'DISCORD_CLIENT_ID must be a Discord snowflake.'),
  DISCORD_GUILD_ID: z
    .string()
    .regex(/^\d{17,19}$/, 'DISCORD_GUILD_ID must be a Discord snowflake.')
    .optional(),
  DISCORD_GUILD_IDS: z.string().optional(),
  BOT_OWNER_IDS: z.string().optional(),
  LOG_CHANNEL_ID: z.string().optional(),
  MOD_AUDIT_CHANNEL_ID: z.string().optional(),
  DJSKIT_COMPONENT_SECRET: z.string().optional(),
  DISCORD_TOTAL_SHARDS: z.string().optional(),
});

export type DefaultEnv = z.infer<typeof defaultEnvSchema>;

/** Discord env fields consumed by {@link defineConfig}. */
export interface DiscordEnv {
  DISCORD_TOKEN: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_GUILD_ID?: string;
  DISCORD_GUILD_IDS?: string;
  BOT_OWNER_IDS?: string;
  LOG_CHANNEL_ID?: string;
  MOD_AUDIT_CHANNEL_ID?: string;
  DJSKIT_COMPONENT_SECRET?: string;
  DISCORD_TOTAL_SHARDS?: string;
}

export interface EnvParseError {
  ok: false;
  error: string[];
}

export interface EnvParseOk<T> {
  ok: true;
  data: T;
}

/** Pure, side-effect-free env validation. Returns either data or error lines. */
export function parseEnv<T extends ZodTypeAny>(
  schema: T,
  source: Record<string, string | undefined> = process.env,
): EnvParseOk<z.infer<T>> | EnvParseError {
  const result = schema.safeParse(source);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const lines = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `  - ${path}: ${issue.message}`;
  });
  return { ok: false, error: lines };
}

/**
 * Validates `source` against `schema` and returns the data, or prints a
 * readable error report and exits the process with code 1 on failure.
 */
export function defineEnv<T extends ZodTypeAny>(
  schema: T,
  source: Record<string, string | undefined> = process.env,
): z.infer<T> {
  const result = parseEnv(schema, source);
  if (result.ok) {
    return result.data;
  }
  console.error('[adjskit/config] Invalid environment configuration:');
  for (const line of result.error) {
    console.error(line);
  }
  process.exit(1);
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseShardCount(value: string | undefined): 'auto' | number {
  if (!value || value.toLowerCase() === 'auto') return 'auto';
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('DISCORD_TOTAL_SHARDS must be "auto" or a positive integer.');
  }
  return parsed;
}

/** Map of every default error message template with `{variable}` placeholders. */
export const defaultMessages = {
  commandPermissionDenied: "You don't have permission to use this command. ({reason})",
  commandCooldown: 'You are on cooldown. Try again <t:{unix}:R> ({seconds}s left).',
  commandNotImplemented: 'Command logic not implemented.',
  commandError: 'There was an error while executing this command!',
  componentPermissionDenied: 'You do not have permission to use this {component}.',
  componentInvalidState: '{reason}',
  componentInvalidStateFallback: 'This component state is invalid.',
  componentError: 'There was an error while executing this component!',
  componentExpired: 'This component has expired.',
  componentWrongUser: 'This component belongs to another user.',
  componentWrongGuild: 'This component belongs to another server.',
  buttonError: 'There was an error while executing this button!',
  modalError: 'There was an error while executing this modal!',
  dropdownError: 'There was an error while executing this dropdown!',
  missingRequiredArgument: 'Missing required argument: `{name}` ({meta})',
  invalidChoice: 'Invalid choice for `{name}`. Must be one of: {choices}',
  invalidInteger: 'Invalid integer for `{name}`.',
  invalidNumber: 'Invalid number for `{name}`.',
  invalidBoolean: 'Invalid boolean for `{name}`.',
  userNotFound: 'Could not find user/member for `{name}`.',
  channelNotFound: 'Could not find channel for `{name}`.',
  roleNotFound: 'Could not find role for `{name}`.',
  mentionableNotFound: 'Could not find a user or role for `{name}`.',
  attachmentNotFound: 'Could not find an attachment for `{name}`.',
  failedToParseArgument: 'Failed to parse required argument `{name}`.',
  guardOwnerOnly: 'This command is for the bot owner only.',
  guardDevOnly: 'This command can only be used in the development server.',
  guardBlacklisted: 'You are not allowed to use this command.',
  guardNotAllowed: 'You are not permitted to use this command.',
  guardMissingRole: 'You are missing a required role to use this command.',
} as const;

export type ErrorMessages = typeof defaultMessages;
export type MessageKey = keyof ErrorMessages;

/**
 * Interpolates `{variable}` placeholders in a template. Missing variables are
 * replaced with an empty string.
 */
export function formatMessage(
  template: string,
  vars: Record<string, string | number> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

/** Builds a bound `t(key, vars)` resolver from a messages map. */
export function createMessageResolver(messages: ErrorMessages) {
  return (key: MessageKey, vars: Record<string, string | number> = {}): string =>
    formatMessage(messages[key], vars);
}

export type MessageResolver = ReturnType<typeof createMessageResolver>;

/** Resolves a {@link CooldownDuration} to milliseconds. Returns 0 when empty. */
export function resolveCooldown(duration: CooldownDuration): number {
  const seconds =
    (duration.seconds ?? 0) +
    (duration.minutes ?? 0) * 60 +
    (duration.hours ?? 0) * 3600 +
    (duration.days ?? 0) * 86400;
  return seconds * 1000;
}

/**
 * Builds the interpolation variables for a cooldown message, given the
 * milliseconds remaining. Produces `{seconds}` (e.g. `12.3`) and `{unix}`
 * (epoch seconds of when the cooldown ends) for a Discord `<t:{unix}:R>`
 * relative timestamp.
 */
export function cooldownMessageVars(msLeft: number): Record<string, string | number> {
  return {
    seconds: (msLeft / 1000).toFixed(1),
    unix: String(Math.floor((Date.now() + msLeft) / 1000)),
  };
}

export interface DefineConfigOptions {
  /** Validated env (use {@link defineEnv} / {@link parseEnv}). */
  env: DiscordEnv;
  /** Command prefix; `null` disables prefix commands (slash-only). Default `null`. */
  prefix?: string | null;
  cooldownBackend?: CooldownBackend;
  commandRegistration?: CommandRegistrationMode;
  componentStateSecret?: string;
  logLevel?: LogLevel;
  /** Override or extend the default error messages. */
  messages?: Partial<ErrorMessages>;
}

export interface AppConfig {
  token: string;
  clientId: string;
  guildId: string;
  guildIds: string[];
  ownerIds: string[];
  devGuildIds: string[];
  prefix: string | null;
  cooldownBackend: CooldownBackend;
  commandRegistration: CommandRegistrationMode;
  componentStateSecret: string;
  logChannelId?: string;
  modAuditChannelId?: string;
  logLevel: LogLevel;
  totalShards: 'auto' | number;
  messages: ErrorMessages;
}

function normalizeBackend(backend: CooldownBackend | undefined): CooldownBackend {
  if (!backend || backend === 'none') return 'memory';
  return backend;
}

/**
 * Merges validated env with adjskit defaults and user overrides into a single
 * typed config object. This is the single source of truth consumed by the
 * client, handlers, and the message resolver.
 */
export function defineConfig(options: DefineConfigOptions): AppConfig {
  const env = options.env;
  const guildIdList = parseList(env.DISCORD_GUILD_IDS);
  const guildIds =
    guildIdList.length > 0 ? guildIdList : env.DISCORD_GUILD_ID ? [env.DISCORD_GUILD_ID] : [];
  const ownerIds = parseList(env.BOT_OWNER_IDS);

  return {
    token: env.DISCORD_TOKEN,
    clientId: env.DISCORD_CLIENT_ID,
    guildId: env.DISCORD_GUILD_ID ?? guildIds[0] ?? '',
    guildIds,
    ownerIds,
    devGuildIds: guildIds,
    prefix: options.prefix ?? null,
    cooldownBackend: normalizeBackend(options.cooldownBackend),
    commandRegistration: options.commandRegistration ?? 'guild',
    componentStateSecret:
      options.componentStateSecret ?? env.DJSKIT_COMPONENT_SECRET ?? env.DISCORD_TOKEN,
    logChannelId: env.LOG_CHANNEL_ID,
    modAuditChannelId: env.MOD_AUDIT_CHANNEL_ID,
    logLevel: options.logLevel ?? 'info',
    totalShards: parseShardCount(env.DISCORD_TOTAL_SHARDS),
    messages: { ...defaultMessages, ...options.messages },
  };
}
