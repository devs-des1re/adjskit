import type { ButtonInteraction } from 'discord.js';
import type { PermissionConfig } from '../types.js';
import type { ButtonDescriptor } from '../descriptors.js';

export type ButtonExecuteFn<TParams> = (
  interaction: ButtonInteraction,
  args: TParams,
) => Promise<void>;

export interface ButtonBuilder<TParams extends Record<string, string> = Record<string, string>> {
  addParam<K extends string>(name: K): ButtonBuilder<TParams & { [P in K]: string }>;
  setPermissions(perms: PermissionConfig): ButtonBuilder<TParams>;
  setExecute(fn: ButtonExecuteFn<TParams>): ButtonBuilder<TParams>;
  build(): ButtonDescriptor<TParams>;
}

interface ButtonBuilderState {
  customId: string;
  params: string[];
  permissions?: PermissionConfig;
  execute?: ButtonExecuteFn<Record<string, string>>;
}

function makeButtonBuilder<TParams extends Record<string, string>>(
  state: ButtonBuilderState,
): ButtonBuilder<TParams> {
  return {
    addParam<K extends string>(name: K): ButtonBuilder<TParams & { [P in K]: string }> {
      return makeButtonBuilder<TParams & { [P in K]: string }>({
        ...state,
        params: [...state.params, name],
      });
    },
    setPermissions(perms: PermissionConfig): ButtonBuilder<TParams> {
      return makeButtonBuilder<TParams>({ ...state, permissions: perms });
    },
    setExecute(fn: ButtonExecuteFn<TParams>): ButtonBuilder<TParams> {
      return makeButtonBuilder<TParams>({
        ...state,
        execute: fn as ButtonExecuteFn<Record<string, string>>,
      });
    },
    build(): ButtonDescriptor<TParams> {
      return {
        customId: state.customId,
        params: state.params,
        permissions: state.permissions,
        execute: state.execute as ButtonDescriptor<TParams>['execute'],
      };
    },
  };
}

/**
 * Declares a button component. `.addParam(name)` declares positional custom-id
 * params (decoded into `args` by the handler); `.setExecute(fn)` receives the
 * button interaction and the decoded args.
 *
 * @example
 * export default createButton('confirm_ban')
 *   .addParam('targetId')
 *   .setExecute(async (interaction, args) => {
 *     await interaction.reply(`Banned <@${args.targetId}>`);
 *   });
 */
export function createButton(customId: string): ButtonBuilder<Record<never, never>> {
  return makeButtonBuilder({ customId, params: [] });
}
