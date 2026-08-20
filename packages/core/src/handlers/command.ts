import {
  Events,
  type ChatInputCommandInteraction,
  type GuildMember,
  type Message,
} from 'discord.js';
import type { AdjskClient } from '../client.js';
import type { AppConfig, MessageResolver } from '../config/index.js';
import { createMessageResolver, cooldownMessageVars } from '../config/index.js';
import { CommandContext, createBypassProxy } from '../context/index.js';
import { extractSlashArgs, resolvePrefixArgs } from '../args/index.js';
import { checkPermissions } from '../permissions.js';
import { logger } from '../logger/index.js';
import type { CooldownStore } from '../cooldown/store.js';

export interface CommandHandlerDeps {
  client: AdjskClient;
  config: AppConfig;
  cooldowns: CooldownStore;
}

/**
 * Registers the slash and prefix command dispatchers on the client.
 *
 * Slash: on `InteractionCreate`, looks up the descriptor, checks permissions
 * and cooldown, extracts args from interaction options, and calls execute with
 * a real interaction as `ictx`.
 *
 * Prefix: on `MessageCreate` (only when `config.prefix` is set), parses the
 * message, resolves tokens into the same resolved objects, and calls execute
 * with a bypass-proxy `ictx` (so `await ictx.reply(...)` no-ops).
 */
export function registerCommandHandler(deps: CommandHandlerDeps): void {
  const { client, config, cooldowns } = deps;
  const t: MessageResolver = createMessageResolver(config.messages);

  // --- SLASH COMMANDS ---
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const desc = client.slashCommands.get(interaction.commandName);
    if (!desc) return;

    try {
      const member = await resolveMember(interaction);
      const access = checkPermissions(
        member,
        interaction.user.id,
        interaction.guildId,
        desc.permissions,
        config,
        t,
      );
      if (!access.allowed) {
        await interaction.reply({
          content: t('commandPermissionDenied', { reason: access.reason ?? '' }),
          ephemeral: true,
        });
        return;
      }

      if (desc.cooldown && desc.cooldown > 0) {
        const msLeft = await cooldowns.check(desc.name, interaction.user.id);
        if (msLeft > 0) {
          await interaction.reply({
            content: t('commandCooldown', cooldownMessageVars(msLeft)),
            ephemeral: true,
          });
          return;
        }
        await cooldowns.set(desc.name, interaction.user.id, desc.cooldown);
      }

      const args = extractSlashArgs(interaction, desc.params);
      const ctx = CommandContext.fromInteraction(interaction);
      if (desc.execute) {
        await desc.execute(ctx, interaction, args);
      } else {
        await interaction.reply({ content: t('commandNotImplemented'), ephemeral: true });
      }
    } catch (err) {
      logger.error(`Error executing slash command ${desc.name}.`, err);
      const payload = { content: t('commandError'), ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => undefined);
      } else {
        await interaction.reply(payload).catch(() => undefined);
      }
    }
  });

  // --- PREFIX COMMANDS ---
  if (!config.prefix) return;
  const prefix = config.prefix;

  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(prefix)) return;

    const tokens = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = tokens.shift()?.toLowerCase();
    if (!commandName) return;

    const desc = client.prefixCommands.get(commandName);
    if (!desc) return;

    try {
      const member = message.member ?? null;
      const access = checkPermissions(
        member,
        message.author.id,
        message.guildId,
        desc.permissions,
        config,
        t,
      );
      if (!access.allowed) {
        await message.reply(t('commandPermissionDenied', { reason: access.reason ?? '' }));
        return;
      }

      if (desc.cooldown && desc.cooldown > 0) {
        const msLeft = await cooldowns.check(desc.name, message.author.id);
        if (msLeft > 0) {
          await message.reply(t('commandCooldown', cooldownMessageVars(msLeft)));
          return;
        }
        await cooldowns.set(desc.name, message.author.id, desc.cooldown);
      }

      const resolved = await resolvePrefixArgs(message, tokens, desc.params, message.guild, 1, t);
      if (!resolved) return; // arg error already replied

      const ctx = CommandContext.fromMessage(message);
      const ictx = createBypassProxy<ChatInputCommandInteraction>();
      if (desc.execute) {
        await desc.execute(ctx, ictx, resolved);
      } else {
        await message.reply(t('commandNotImplemented'));
      }
    } catch (err) {
      logger.error(`Error executing prefix command ${desc.name}.`, err);
      await message.reply(t('commandError')).catch(() => undefined);
    }
  });
}

async function resolveMember(
  interaction: ChatInputCommandInteraction,
): Promise<GuildMember | null> {
  const member = interaction.member as GuildMember | null;
  if (member) return member;
  if (!interaction.guild) return null;
  try {
    return await interaction.guild.members.fetch(interaction.user.id);
  } catch {
    return null;
  }
}
