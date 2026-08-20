import { ApplicationCommandOptionType } from 'discord.js';
import type { ApplicationCommandData, ApplicationCommandOptionData } from 'discord.js';
import { ParamType } from '../types.js';
import type { CommandDescriptor, ParamDescriptor } from '../descriptors.js';
import type { AdjskClient } from '../client.js';
import type { AppConfig } from '../config/index.js';
import { logger } from '../logger/index.js';

function paramTypeToOptionType(type: ParamType): ApplicationCommandOptionType {
  switch (type) {
    case ParamType.String:
      return ApplicationCommandOptionType.String;
    case ParamType.Integer:
      return ApplicationCommandOptionType.Integer;
    case ParamType.Number:
      return ApplicationCommandOptionType.Number;
    case ParamType.Boolean:
      return ApplicationCommandOptionType.Boolean;
    case ParamType.User:
      return ApplicationCommandOptionType.User;
    case ParamType.Channel:
      return ApplicationCommandOptionType.Channel;
    case ParamType.Role:
      return ApplicationCommandOptionType.Role;
    case ParamType.Mentionable:
      return ApplicationCommandOptionType.Mentionable;
    case ParamType.Attachment:
      return ApplicationCommandOptionType.Attachment;
  }
}

function buildOption(param: ParamDescriptor): ApplicationCommandOptionData {
  const option: Record<string, unknown> = {
    type: paramTypeToOptionType(param.type),
    name: param.name,
    description: param.description ?? param.name,
    required: param.required,
  };
  if (param.choices && param.choices.length > 0) {
    option.choices = param.choices.map((choice) => ({ name: choice, value: choice }));
  }
  if (param.autocomplete) option.autocomplete = true;
  return option as unknown as ApplicationCommandOptionData;
}

/**
 * Builds a discord.js {@link ApplicationCommandData} from a command descriptor.
 * Only slash/both commands are eligible; the descriptor's params map directly
 * to application command options.
 */
export function buildApplicationCommandData(desc: CommandDescriptor): ApplicationCommandData {
  const data: ApplicationCommandData = {
    name: desc.name,
    description: desc.description ?? 'No description provided',
    options: desc.params.map(buildOption),
  };
  if (desc.defaultMemberPermissions !== undefined) {
    data.defaultMemberPermissions = desc.defaultMemberPermissions;
  }
  return data;
}

/**
 * Registers all slash/both commands with Discord via the client's application
 * command manager. Must be called after the client is ready (`client.login`).
 * Respects `config.commandRegistration`: `global`, `guild`, or `multiGuild`.
 */
export async function registerSlashCommands(client: AdjskClient, config: AppConfig): Promise<void> {
  if (!client.application) {
    throw new Error('Client must be ready before registering commands (call after client.login).');
  }

  const data = [...client.slashCommands.values()]
    .filter((desc) => desc.type === 'slash' || desc.type === 'both')
    .map(buildApplicationCommandData);

  const mode = config.commandRegistration;
  if (mode === 'global') {
    await client.application.commands.set(data);
    logger.info(`Registered ${data.length} command(s) globally.`);
    return;
  }

  if (!config.guildId) {
    throw new Error(
      'commandRegistration "guild"/"multiGuild" requires DISCORD_GUILD_ID or DISCORD_GUILD_IDS.',
    );
  }

  if (mode === 'multiGuild') {
    for (const guildId of config.guildIds) {
      await client.application.commands.set(data, guildId);
    }
    logger.info(`Registered ${data.length} command(s) across ${config.guildIds.length} guild(s).`);
    return;
  }

  await client.application.commands.set(data, config.guildId);
  logger.info(`Registered ${data.length} command(s) to guild ${config.guildId}.`);
}
