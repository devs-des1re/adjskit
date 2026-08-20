import type {
  ChannelSelectMenuInteraction,
  GuildBasedChannel,
  MentionableSelectMenuInteraction,
  Role,
  RoleSelectMenuInteraction,
  StringSelectMenuInteraction,
  User,
  UserSelectMenuInteraction,
} from 'discord.js';
import { SelectType } from '../types.js';
import type { PermissionConfig } from '../types.js';
import type { DropdownDescriptor } from '../descriptors.js';

export type SelectInteraction =
  | StringSelectMenuInteraction
  | UserSelectMenuInteraction
  | RoleSelectMenuInteraction
  | ChannelSelectMenuInteraction
  | MentionableSelectMenuInteraction;

type SelectValueMap = {
  [SelectType.String]: string;
  [SelectType.Role]: Role;
  [SelectType.Channel]: GuildBasedChannel;
  [SelectType.User]: User;
  [SelectType.Mentionable]: User | Role;
};

export type DropdownExecuteFn<TParams, T> = (
  interaction: SelectInteraction,
  args: TParams,
  values: T[],
) => Promise<void>;

export interface DropdownBuilder<
  TParams extends Record<string, string> = Record<string, string>,
  T = unknown,
> {
  addParam<K extends string>(name: K): DropdownBuilder<TParams & { [P in K]: string }, T>;
  setPermissions(perms: PermissionConfig): DropdownBuilder<TParams, T>;
  setExecute(fn: DropdownExecuteFn<TParams, T>): DropdownBuilder<TParams, T>;
  build(): DropdownDescriptor<TParams>;
}

interface DropdownBuilderState {
  customId: string;
  selectType: SelectType;
  params: string[];
  permissions?: PermissionConfig;
  execute?: DropdownExecuteFn<Record<string, string>, unknown>;
}

function makeDropdownBuilder<TParams extends Record<string, string>, T>(
  state: DropdownBuilderState,
): DropdownBuilder<TParams, T> {
  return {
    addParam<K extends string>(name: K): DropdownBuilder<TParams & { [P in K]: string }, T> {
      return makeDropdownBuilder<TParams & { [P in K]: string }, T>({
        ...state,
        params: [...state.params, name],
      });
    },
    setPermissions(perms: PermissionConfig): DropdownBuilder<TParams, T> {
      return makeDropdownBuilder<TParams, T>({ ...state, permissions: perms });
    },
    setExecute(fn: DropdownExecuteFn<TParams, T>): DropdownBuilder<TParams, T> {
      return makeDropdownBuilder<TParams, T>({
        ...state,
        execute: fn as DropdownExecuteFn<Record<string, string>, unknown>,
      });
    },
    build(): DropdownDescriptor<TParams> {
      return {
        customId: state.customId,
        params: state.params,
        selectType: state.selectType,
        permissions: state.permissions,
        execute: state.execute as DropdownDescriptor<TParams>['execute'],
      };
    },
  };
}

/**
 * Declares a dropdown (select menu). `type` selects the value type
 * (`string`/`role`/`channel`/`user`/`mentionable`); the execute fn receives
 * the decoded custom-id `args` and the selected `values`.
 *
 * @example
 * export default createDropdown('roleMenu', { type: SelectType.Role })
 *   .setExecute(async (interaction, args, values) => {
 *     await interaction.reply(`Picked ${values.map((r) => r.name).join(', ')}`);
 *   });
 */
export function createDropdown<T extends SelectType>(
  customId: string,
  opts: { type: T },
): DropdownBuilder<Record<never, never>, SelectValueMap[T]> {
  return makeDropdownBuilder<Record<never, never>, SelectValueMap[T]>({
    customId,
    selectType: opts.type,
    params: [],
  });
}
