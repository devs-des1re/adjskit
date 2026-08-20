import type { ClientEvents, PermissionResolvable } from 'discord.js';
import type { CommandType, FieldStyle, PermissionConfig, SelectType } from './types.js';

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
export interface DropdownDescriptor<TParams = Record<string, string>> {
  customId: string;
  /** Declared custom-id params, packed/decoded by the codec into `args`. */
  params: string[];
  selectType: SelectType;
  permissions?: PermissionConfig;
  execute?: (interaction: unknown, args: TParams, values: unknown[]) => Promise<void>;
}

/** Option for a choice-based modal field (string select / radio group). */
export interface ModalChoiceOption {
  label: string;
  value: string;
  description?: string;
  default?: boolean;
}

/**
 * Modal field kinds supported by the modal builder. Mapped to discord.js v2
 * modal components: `field` → TextInput, `textDisplay` → TextDisplay,
 * `stringSelect` → StringSelectMenu, `radioGroup` → RadioGroup,
 * `imageUpload` → FileUpload.
 */
export type ModalFieldKind =
  'field' | 'textDisplay' | 'stringSelect' | 'radioGroup' | 'imageUpload';

/** Full descriptor for a single modal field. */
export interface ModalFieldDescriptor {
  name: string;
  kind: ModalFieldKind;
  label?: string;
  description?: string;
  required?: boolean;
  // text input (field):
  style?: FieldStyle;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  value?: string;
  // string select / radio group:
  options?: ModalChoiceOption[];
  minValues?: number;
  maxValues?: number;
  // text display:
  content?: string;
}

export interface ModalDescriptor<
  TParams = Record<string, string>,
  TFields = Record<string, unknown>,
> {
  customId: string;
  params: string[];
  title?: string;
  fields: ModalFieldDescriptor[];
  permissions?: PermissionConfig;
  execute?: (interaction: unknown, args: TParams, fields: TFields) => Promise<void>;
}

/** Discord event listener descriptor. */
export interface EventDescriptor<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once: boolean;
  execute?: (...args: ClientEvents[K]) => Promise<void>;
}
