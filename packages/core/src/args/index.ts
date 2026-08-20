import type { ChatInputCommandInteraction, Guild, Message } from 'discord.js';
import { Collection } from 'discord.js';
import { ParamType } from '../types.js';
import type { ParamDescriptor } from '../descriptors.js';
import type { MessageResolver } from '../config/index.js';

export interface ResolvedArgs {
  [key: string]: unknown;
  /** Prefix only: the raw text after the command name + consumed args. */
  _raw?: string;
  /** Prefix only: any tokens not consumed by declared params. */
  _rest?: string[];
}

/**
 * Extracts resolved arguments directly from a slash interaction's options.
 * Each param type maps to the corresponding discord.js option accessor,
 * yielding the same resolved objects the prefix resolver produces.
 */
export function extractSlashArgs(
  interaction: ChatInputCommandInteraction,
  params: ParamDescriptor[],
): ResolvedArgs {
  const args: ResolvedArgs = {};
  for (const param of params) {
    switch (param.type) {
      case ParamType.String:
        args[param.name] = interaction.options.getString(param.name) ?? undefined;
        break;
      case ParamType.Integer:
        args[param.name] = interaction.options.getInteger(param.name) ?? undefined;
        break;
      case ParamType.Number:
        args[param.name] = interaction.options.getNumber(param.name) ?? undefined;
        break;
      case ParamType.Boolean:
        args[param.name] = interaction.options.getBoolean(param.name) ?? undefined;
        break;
      case ParamType.User:
        args[param.name] = interaction.options.getUser(param.name) ?? undefined;
        break;
      case ParamType.Channel:
        args[param.name] = interaction.options.getChannel(param.name) ?? undefined;
        break;
      case ParamType.Role:
        args[param.name] = interaction.options.getRole(param.name) ?? undefined;
        break;
      case ParamType.Mentionable:
        args[param.name] = interaction.options.getMentionable(param.name) ?? undefined;
        break;
      case ParamType.Attachment:
        args[param.name] = interaction.options.getAttachment(param.name) ?? undefined;
        break;
    }
  }
  return args;
}

/**
 * Resolves raw message tokens into the same resolved objects slash commands
 * receive. Mentions / ids are fetched from cache first, then via the REST
 * `fetch` fallback, then by name search for users / roles / channels.
 * Attachment params pull from `message.attachments` (in declaration order)
 * rather than consuming a token. On a required-but-missing arg, replies to the
 * message with a localized error and returns `null`.
 *
 * @param consumedTokens How many leading tokens make up the prefix + command
 *   name (used to compute `_raw` from the original message content).
 */
export async function resolvePrefixArgs(
  message: Message,
  tokens: string[],
  params: ParamDescriptor[],
  guild: Guild,
  consumedTokens: number,
  t: MessageResolver,
): Promise<ResolvedArgs | null> {
  const args: ResolvedArgs = {};
  const restTokens = [...tokens];
  const attachmentQueue = new Collection(message.attachments.map((a) => [a.id, a] as const));

  for (let index = 0; index < params.length; index++) {
    const param = params[index]!;
    const isLastParam = index === params.length - 1;

    if (param.type === ParamType.Attachment) {
      const attachment = attachmentQueue.first();
      if (attachment) attachmentQueue.delete(attachment.id);
      if (!attachment && param.required) {
        await message.reply(t('attachmentNotFound', { name: param.name }));
        return null;
      }
      args[param.name] = attachment ?? undefined;
      continue;
    }

    if (restTokens.length === 0) {
      if (param.required) {
        await message.reply(
          t('missingRequiredArgument', { name: param.name, meta: param.description ?? param.type }),
        );
        return null;
      }
      args[param.name] = undefined;
      continue;
    }

    const token = restTokens.shift() as string;
    let resolved: unknown = null;

    switch (param.type) {
      case ParamType.String: {
        if (isLastParam && restTokens.length > 0) {
          resolved = [token, ...restTokens.splice(0)].join(' ');
        } else {
          resolved = token;
        }
        if (param.choices && !param.choices.includes(resolved as string)) {
          await message.reply(
            t('invalidChoice', { name: param.name, choices: param.choices.join(', ') }),
          );
          return null;
        }
        break;
      }
      case ParamType.Integer: {
        const parsed = Number.parseInt(token, 10);
        if (Number.isNaN(parsed)) {
          if (param.required) {
            await message.reply(t('invalidInteger', { name: param.name }));
            return null;
          }
          resolved = undefined;
        } else {
          resolved = parsed;
        }
        break;
      }
      case ParamType.Number: {
        const parsed = Number.parseFloat(token);
        if (Number.isNaN(parsed)) {
          if (param.required) {
            await message.reply(t('invalidNumber', { name: param.name }));
            return null;
          }
          resolved = undefined;
        } else {
          resolved = parsed;
        }
        break;
      }
      case ParamType.Boolean: {
        const lower = token.toLowerCase();
        if (['true', 'yes', '1', 'y', 'on'].includes(lower)) resolved = true;
        else if (['false', 'no', '0', 'n', 'off'].includes(lower)) resolved = false;
        else if (param.required) {
          await message.reply(t('invalidBoolean', { name: param.name }));
          return null;
        } else {
          resolved = undefined;
        }
        break;
      }
      case ParamType.User: {
        resolved = await resolveUser(guild, token);
        if (resolved === null && param.required) {
          await message.reply(t('userNotFound', { name: param.name }));
          return null;
        }
        break;
      }
      case ParamType.Channel: {
        resolved = await resolveChannel(guild, token);
        if (resolved === null && param.required) {
          await message.reply(t('channelNotFound', { name: param.name }));
          return null;
        }
        break;
      }
      case ParamType.Role: {
        resolved = resolveRole(guild, token);
        if (resolved === null && param.required) {
          await message.reply(t('roleNotFound', { name: param.name }));
          return null;
        }
        break;
      }
      case ParamType.Mentionable: {
        resolved = (await resolveUser(guild, token)) ?? resolveRole(guild, token);
        if (resolved === null && param.required) {
          await message.reply(t('mentionableNotFound', { name: param.name }));
          return null;
        }
        break;
      }
    }

    args[param.name] = resolved ?? undefined;
  }

  const totalConsumed = consumedTokens + (tokens.length - restTokens.length);
  const rawMatch = message.content.match(new RegExp(`^(?:\\S+\\s+){${totalConsumed}}(.*)$`));
  args._raw = rawMatch ? rawMatch[1] : restTokens.join(' ');
  args._rest = restTokens;
  return args;
}

async function resolveUser(guild: Guild, token: string): Promise<unknown | null> {
  const idMatch = token.match(/^<@!?(\d+)>$/) ?? token.match(/^(\d+)$/);
  if (idMatch) {
    try {
      const member = await guild.members.fetch(idMatch[1]!);
      return member.user;
    } catch {
      // not a real member — fall through to username search
    }
  }
  try {
    const search = await guild.members.fetch({ query: token, limit: 1 });
    if (search.size > 0) return search.first()!.user;
  } catch {
    // search failed
  }
  return null;
}

async function resolveChannel(guild: Guild, token: string): Promise<unknown | null> {
  const idMatch = token.match(/^<#(\d+)>$/) ?? token.match(/^(\d+)$/);
  if (idMatch) {
    const cached = guild.channels.cache.get(idMatch[1]!);
    if (cached) return cached;
    try {
      return await guild.channels.fetch(idMatch[1]!);
    } catch {
      // not found — fall through
    }
  }
  const byName = guild.channels.cache.find((c) => c.name.toLowerCase() === token.toLowerCase());
  return byName ?? null;
}

function resolveRole(guild: Guild, token: string): unknown | null {
  const idMatch = token.match(/^<@&(\d+)>$/) ?? token.match(/^(\d+)$/);
  if (idMatch) {
    const cached = guild.roles.cache.get(idMatch[1]!);
    if (cached) return cached;
  }
  const byName = guild.roles.cache.find((r) => r.name.toLowerCase() === token.toLowerCase());
  return byName ?? null;
}
