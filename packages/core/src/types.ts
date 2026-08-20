/**
 * Foundational, cross-cutting type contracts for adjskit.
 *
 * These are stable enums and interfaces shared across the command, component,
 * event, config, and logger subsystems. Descriptor *shapes* live in
 * `descriptors.ts`; the fluent builders that produce them live in their own
 * phases, but every builder/handler/loader depends on the contracts here.
 */

/** How a command is exposed: slash (interaction), prefix (message), or both. */
export type CommandType = 'slash' | 'prefix' | 'both';

/** Backing store for cooldown tracking. `none` is normalized to `memory`. */
export type CooldownBackend =
  'none' | 'memory' | 'file' | 'sqlite' | 'postgres' | 'mysql' | 'mongo' | 'redis';

/** Where slash/context commands are registered. */
export type CommandRegistrationMode = 'guild' | 'global' | 'multiGuild';

/** Logger severity levels. `success` sits between `info` and `warn`. */
export type LogLevel = 'success' | 'info' | 'warn' | 'error' | 'debug';

/** Argument types accepted by commands. */
export enum ParamType {
  String = 'string',
  Integer = 'integer',
  Number = 'number',
  Boolean = 'boolean',
  User = 'user',
  Channel = 'channel',
  Role = 'role',
  Mentionable = 'mentionable',
  Attachment = 'attachment',
}

/** Dropdown (select menu) value types. */
export enum SelectType {
  String = 'string',
  Role = 'role',
  Channel = 'channel',
  User = 'user',
  Mentionable = 'mentionable',
}

/** Text input styles for modal fields. */
export enum FieldStyle {
  Short = 'short',
  Paragraph = 'paragraph',
}

/** Permission scoping for any handler. */
export interface PermissionConfig {
  allowedRoles?: string[];
  allowedUsers?: string[];
  blacklistedRoles?: string[];
  blacklistedUsers?: string[];
  ownerOnly?: boolean;
  devOnly?: boolean;
}

/**
 * Cooldown duration expressed in human-friendly units. Any combination is
 * summed and resolved to milliseconds via `resolveCooldown()`.
 */
export interface CooldownDuration {
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
}
