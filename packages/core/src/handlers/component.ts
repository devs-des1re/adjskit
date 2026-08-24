import type { GuildMember, ModalSubmitInteraction } from 'discord.js';
import type { AdjskClient } from '../client.js';
import type { AppConfig, MessageResolver } from '../config/index.js';
import { createMessageResolver } from '../config/index.js';
import { checkPermissions } from '../permissions.js';
import { parseCustomId } from '../customId/index.js';
import { logger } from '../logger/index.js';
import type { ModalDescriptor, ModalFieldDescriptor } from '../descriptors.js';

export interface ComponentHandlerDeps {
  client: AdjskClient;
  config: AppConfig;
}

function zipParams(names: string[], values: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  names.forEach((name, i) => {
    args[name] = values[i] ?? '';
  });
  return args;
}

async function resolveInteractionMember(interaction: {
  member?: GuildMember | unknown;
  guild?: { members: { fetch: (id: string) => Promise<GuildMember> } } | null;
  user: { id: string };
}): Promise<GuildMember | null> {
  const member = interaction.member as GuildMember | undefined;
  if (member && 'roles' in member) return member;
  if (!interaction.guild) return null;
  try {
    return await interaction.guild.members.fetch(interaction.user.id);
  } catch {
    return null;
  }
}

function reasonMessageKey(reason: string | undefined, t: MessageResolver): string {
  switch (reason) {
    case 'expired':
      return t('componentExpired');
    case 'wrongUser':
      return t('componentWrongUser');
    case 'wrongGuild':
      return t('componentWrongGuild');
    default:
      return t('componentInvalidStateFallback');
  }
}

/** Walks a modal submission tree and collects each field's ModalData by customId. */
function collectModalData(
  interaction: ModalSubmitInteraction,
): Map<
  string,
  { type: number; value?: string; values?: readonly string[]; attachments?: unknown }
> {
  const map = new Map<
    string,
    { type: number; value?: string; values?: readonly string[]; attachments?: unknown }
  >();

  for (const top of interaction.components) {
    // Check if it's an action row with components (has a components property that's an array)
    if ('components' in top && Array.isArray(top.components)) {
      // It's an action row - iterate through its components
      for (const sub of top.components) {
        // Extract the data based on what's available
        const customId = 'customId' in sub ? String(sub.customId) : '';
        if (!customId) continue;

        const data: {
          type: number;
          value?: string;
          values?: readonly string[];
          attachments?: unknown;
        } = {
          type: 'type' in sub ? Number(sub.type) : 0,
        };

        if ('value' in sub) {
          data.value = sub.value as string | undefined;
        }
        if ('values' in sub) {
          data.values = sub.values as readonly string[] | undefined;
        }
        if ('attachments' in sub) {
          data.attachments = sub.attachments as unknown;
        }

        map.set(customId, data);
      }
    } else if ('component' in top) {
      // Some Discord.js versions wrap components in a 'component' property
      const component = top.component as {
        customId?: string;
        type?: number;
        value?: string;
        values?: readonly string[];
        attachments?: unknown;
      };
      if (component.customId) {
        const data: {
          type: number;
          value?: string;
          values?: readonly string[];
          attachments?: unknown;
        } = {
          type: component.type ?? 0,
        };
        if (component.value !== undefined) data.value = component.value;
        if (component.values !== undefined) data.values = component.values;
        if (component.attachments !== undefined) data.attachments = component.attachments;
        map.set(component.customId, data);
      }
    } else if ('customId' in top) {
      // Direct component without wrapper
      const customId = String(top.customId);
      const data: {
        type: number;
        value?: string;
        values?: readonly string[];
        attachments?: unknown;
      } = {
        type: 'type' in top ? Number(top.type) : 0,
      };

      if ('value' in top) {
        data.value = top.value as string | undefined;
      }
      if ('values' in top) {
        data.values = top.values as readonly string[] | undefined;
      }
      if ('attachments' in top) {
        data.attachments = top.attachments as unknown;
      }

      map.set(customId, data);
    }
    // TextDisplay entries carry no submitted value and are skipped.
  }
  return map;
}

/** Extracts a typed value per declared field from a modal submission. */
export function extractModalFields(
  interaction: ModalSubmitInteraction,
  fields: ModalFieldDescriptor[],
): Record<string, unknown> {
  const submitted = collectModalData(interaction);
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const data = submitted.get(field.name);
    if (field.kind === 'field') {
      result[field.name] = data?.value;
    } else if (field.kind === 'stringSelect') {
      result[field.name] = data?.values ?? [];
    } else if (field.kind === 'radioGroup') {
      result[field.name] = (data as { value?: string | null } | undefined)?.value ?? null;
    } else if (field.kind === 'imageUpload') {
      result[field.name] = (data as { attachments?: unknown } | undefined)?.attachments ?? null;
    }
    // textDisplay fields carry no submitted value.
  }
  return result;
}

/**
 * Registers button, modal, and dropdown dispatchers. Each parses the custom id
 * (for buttons/modals/dropdowns with params), enforces permissions, and calls
 * the component's execute fn with the decoded args (and, for modals, the
 * submitted fields; for dropdowns, the selected values).
 */
export function registerComponentHandler(deps: ComponentHandlerDeps): void {
  const { client, config } = deps;
  const t: MessageResolver = createMessageResolver(config.messages);

  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isButton()) {
        const parsed = parseCustomId(interaction.customId, {
          userId: interaction.user.id,
          guildId: interaction.guildId,
        });
        const desc = client.buttons.get(parsed.base);
        if (!desc) return;
        if (!parsed.valid) {
          await interaction.reply({ content: reasonMessageKey(parsed.reason, t), ephemeral: true });
          return;
        }
        const member = await resolveInteractionMember(interaction);
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
            content: t('componentPermissionDenied', { component: 'button' }),
            ephemeral: true,
          });
          return;
        }
        const args = zipParams(desc.params, parsed.params);
        if (desc.execute) {
          await desc.execute(interaction, args);
        }
        return;
      }

      if (interaction.isModalSubmit()) {
        const parsed = parseCustomId(interaction.customId, {
          userId: interaction.user.id,
          guildId: interaction.guildId,
        });
        const desc = client.modals.get(parsed.base) as ModalDescriptor | undefined;
        if (!desc) return;
        if (!parsed.valid) {
          await interaction.reply({ content: reasonMessageKey(parsed.reason, t), ephemeral: true });
          return;
        }
        const member = await resolveInteractionMember(interaction);
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
            content: t('componentPermissionDenied', { component: 'modal' }),
            ephemeral: true,
          });
          return;
        }
        const args = zipParams(desc.params, parsed.params);
        const fields = extractModalFields(interaction, desc.fields);
        if (desc.execute) {
          await desc.execute(interaction, args, fields);
        }
        return;
      }

      if (interaction.isAnySelectMenu()) {
        const parsed = parseCustomId(interaction.customId, {
          userId: interaction.user.id,
          guildId: interaction.guildId,
        });
        const desc = client.dropdowns.get(parsed.base);
        if (!desc) return;
        if (!parsed.valid) {
          await interaction.reply({ content: reasonMessageKey(parsed.reason, t), ephemeral: true });
          return;
        }
        const member = await resolveInteractionMember(interaction);
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
            content: t('componentPermissionDenied', { component: 'dropdown' }),
            ephemeral: true,
          });
          return;
        }
        const args = zipParams(desc.params, parsed.params);
        const values = interaction.values;
        if (desc.execute) {
          await desc.execute(interaction, args, values);
        }
        return;
      }
    } catch (err) {
      logger.error('Error executing a component interaction.', err);
      const repliable = interaction as unknown as {
        replied: boolean;
        deferred: boolean;
        reply: (options: { content: string; ephemeral?: boolean }) => Promise<unknown>;
        followUp: (options: { content: string; ephemeral?: boolean }) => Promise<unknown>;
      };
      const reply = (content: string) =>
        repliable.replied || repliable.deferred
          ? repliable.followUp({ content, ephemeral: true }).catch(() => undefined)
          : repliable.reply({ content, ephemeral: true }).catch(() => undefined);
      await reply(t('componentError'));
    }
  });
}
