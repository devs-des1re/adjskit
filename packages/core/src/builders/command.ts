import type {
  Attachment,
  ChatInputCommandInteraction,
  GuildBasedChannel,
  PermissionResolvable,
  Role,
  User,
} from 'discord.js';
import type { CooldownDuration, CommandType, ParamType, PermissionConfig } from '../types.js';
import type { CommandDescriptor, ParamDescriptor } from '../descriptors.js';
import { resolveCooldown } from '../config/index.js';
import type { CommandContext } from '../context/index.js';

/** Maps a {@link ParamType} to the resolved value type the execute fn receives. */
type ParamTypeMap = {
  [ParamType.String]: string;
  [ParamType.Integer]: number;
  [ParamType.Number]: number;
  [ParamType.Boolean]: boolean;
  [ParamType.User]: User;
  [ParamType.Channel]: GuildBasedChannel;
  [ParamType.Role]: Role;
  [ParamType.Mentionable]: User | Role;
  [ParamType.Attachment]: Attachment;
};

export interface ParamOptions {
  required?: boolean;
  description?: string;
  choices?: string[];
  autocomplete?: boolean;
  /** Prefix only: the last string param consumes all remaining tokens. */
  rest?: boolean;
}

type ResolvedParam<T extends ParamType, O extends ParamOptions | undefined> = O extends {
  required: true;
}
  ? ParamTypeMap[T]
  : ParamTypeMap[T] | undefined;

export type CommandExecuteFn<TArgs> = (
  ctx: CommandContext,
  ictx: ChatInputCommandInteraction,
  args: TArgs,
) => Promise<void>;

export interface CommandBuilder<TArgs extends Record<string, unknown> = Record<string, unknown>> {
  setDescription(desc: string): CommandBuilder<TArgs>;
  setModule(module: string): CommandBuilder<TArgs>;
  setMeta(key: string, value: unknown): CommandBuilder<TArgs>;
  setType(type: CommandType): CommandBuilder<TArgs>;
  addAlias(alias: string): CommandBuilder<TArgs>;
  addParam<K extends string, T extends ParamType, O extends ParamOptions | undefined>(
    name: K,
    type: T,
    opts?: O,
  ): CommandBuilder<TArgs & { [P in K]: ResolvedParam<T, O> }>;
  setCooldown(duration: CooldownDuration): CommandBuilder<TArgs>;
  setPermissions(perms: PermissionConfig): CommandBuilder<TArgs>;
  setOwnerOnly(): CommandBuilder<TArgs>;
  setDevOnly(): CommandBuilder<TArgs>;
  setDefaultMemberPermissions(perms: PermissionResolvable): CommandBuilder<TArgs>;
  setExecute(fn: CommandExecuteFn<TArgs>): CommandBuilder<TArgs>;
  build(): CommandDescriptor<TArgs>;
}

interface CommandBuilderState {
  name: string;
  description?: string;
  module?: string;
  metadata?: Record<string, unknown>;
  type: CommandType;
  aliases: string[];
  params: ParamDescriptor[];
  cooldown?: number;
  permissions?: PermissionConfig;
  defaultMemberPermissions?: PermissionResolvable;
  execute?: CommandExecuteFn<Record<string, unknown>>;
}

function makeCommandBuilder<TArgs extends Record<string, unknown>>(
  state: CommandBuilderState,
): CommandBuilder<TArgs> {
  return {
    setDescription(desc) {
      return makeCommandBuilder<TArgs>({ ...state, description: desc });
    },
    setModule(module) {
      return makeCommandBuilder<TArgs>({ ...state, module });
    },
    setMeta(key, value) {
      return makeCommandBuilder<TArgs>({
        ...state,
        metadata: { ...(state.metadata ?? {}), [key]: value },
      });
    },
    setType(type) {
      return makeCommandBuilder<TArgs>({ ...state, type });
    },
    addAlias(alias) {
      return makeCommandBuilder<TArgs>({ ...state, aliases: [...state.aliases, alias] });
    },
    addParam<K extends string, T extends ParamType, O extends ParamOptions | undefined>(
      name: K,
      type: T,
      opts?: O,
    ): CommandBuilder<TArgs & { [P in K]: ResolvedParam<T, O> }> {
      const param: ParamDescriptor = {
        name,
        type,
        required: opts?.required ?? false,
        description: opts?.description,
        choices: opts?.choices,
        autocomplete: opts?.autocomplete,
        rest: opts?.rest,
      };
      return makeCommandBuilder<TArgs & { [P in K]: ResolvedParam<T, O> }>({
        ...state,
        params: [...state.params, param],
      });
    },
    setCooldown(duration) {
      return makeCommandBuilder<TArgs>({ ...state, cooldown: resolveCooldown(duration) });
    },
    setPermissions(perms) {
      return makeCommandBuilder<TArgs>({ ...state, permissions: perms });
    },
    setOwnerOnly() {
      return makeCommandBuilder<TArgs>({
        ...state,
        permissions: { ...(state.permissions ?? {}), ownerOnly: true },
      });
    },
    setDevOnly() {
      return makeCommandBuilder<TArgs>({
        ...state,
        permissions: { ...(state.permissions ?? {}), devOnly: true },
      });
    },
    setDefaultMemberPermissions(perms) {
      return makeCommandBuilder<TArgs>({ ...state, defaultMemberPermissions: perms });
    },
    setExecute(fn) {
      return makeCommandBuilder<TArgs>({
        ...state,
        execute: fn as CommandExecuteFn<Record<string, unknown>>,
      });
    },
    build(): CommandDescriptor<TArgs> {
      return {
        name: state.name,
        type: state.type,
        description: state.description,
        module: state.module,
        metadata: state.metadata,
        aliases: state.aliases,
        params: state.params,
        cooldown: state.cooldown,
        permissions: state.permissions,
        defaultMemberPermissions: state.defaultMemberPermissions,
        execute: state.execute as CommandDescriptor<TArgs>['execute'],
      };
    },
  };
}

/**
 * Entry point for defining a command. Chain methods to declare description,
 * module/metadata, type (slash/prefix/both), aliases, typed params, cooldown,
 * permissions, and the execute fn, then `.build()` to produce a descriptor.
 *
 * @example
 * export default createCommand('ban')
 *   .setDescription('Ban a member')
 *   .setModule('moderation')
 *   .setType('both')
 *   .addParam('user', ParamType.User, { required: true })
 *   .setCooldown({ minutes: 5 })
 *   .setExecute(async (ctx, ictx, args) => { ... });
 */
export function createCommand(name: string): CommandBuilder<Record<never, never>> {
  return makeCommandBuilder<Record<never, never>>({
    name,
    type: 'both',
    aliases: [],
    params: [],
  });
}
