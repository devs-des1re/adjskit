import type { ClientEvents, PermissionResolvable } from 'discord.js';
import type { CommandType, PermissionConfig, SelectType } from './types.js';

/**
 * Descriptor for a single command argument. Slash commands map these directly
 * to application command options; prefix commands resolve raw tokens into the
 * same resolved objects (User, GuildBasedChannel, Role, ...) via the arg
 * engine.
 */
export interface ParamDescriptor {
  name: string;
  type: import('./types.js').ParamType;
  required: boolean;
  description?: string;
  choices?: string[];
  autocomplete?: boolean;
  /** Prefix only: when true (last string param), consumes all remaining tokens. */
  rest?: boolean;
}

/**
 * Resolved command definition. Produced by the command builder (Phase 2) and
 * consumed by the command loader/handler. `execute` receives the unified
 * `ctx` (always present), the interaction context `ictx` (slash only; a bypass
 * proxy for prefix), and the resolved `args`. The loose `unknown` context
 * types are tightened by the builder's generic API at author time.
 */
export interface CommandDescriptor<TArgs = Record<string, unknown>> {
  name: string;
  type: CommandType;
  description?: string;
  /** Logical grouping, e.g. `moderation`. */
  module?: string;
  /** Free-form misc metadata. */
  metadata?: Record<string, unknown>;
  aliases: string[];
  params: ParamDescriptor[];
  /** Cooldown in milliseconds (resolved from a CooldownDuration). */
  cooldown?: number;
  permissions?: PermissionConfig;
  defaultMemberPermissions?: PermissionResolvable;
  execute?: (ctx: unknown, ictx: unknown, args: TArgs) => Promise<void>;
}

/**
 * Button component descriptor. Declared params are positional and packed into
 * the custom id by the codec; the handler decodes them back into `args`.
 */
export interface ButtonDescriptor<TParams = Record<string, string>> {
  customId: string;
  params: string[];
  permissions?: PermissionConfig;
  execute?: (interaction: unknown, args: TParams) => Promise<void>;
}

/** Dropdown (select menu) component descriptor. */
export interface DropdownDescriptor {
  customId: string;
  selectType: SelectType;
  permissions?: PermissionConfig;
  execute?: (interaction: unknown, values: unknown[]) => Promise<void>;
}

/**
 * Modal field kinds supported by the modal builder (Phase 3). The full
 * {@link ModalFieldDescriptor} shape is finalized alongside the builder; here
 * it is referenced loosely so the client can store modal descriptors early.
 */
export type ModalFieldKind =
  'text' | 'textDisplay' | 'stringSelect' | 'radio' | 'imageUpload' | 'field';

export interface ModalDescriptor<TFields = Record<string, unknown>> {
  customId: string;
  title?: string;
  fields: unknown[];
  permissions?: PermissionConfig;
  execute?: (interaction: unknown, fields: TFields) => Promise<void>;
}

/** Discord event listener descriptor. */
export interface EventDescriptor<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once: boolean;
  execute?: (...args: ClientEvents[K]) => Promise<void>;
}
