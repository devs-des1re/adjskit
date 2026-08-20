import type {
  ChatInputCommandInteraction,
  Guild,
  GuildMember,
  Message,
  TextBasedChannel,
  User,
} from 'discord.js';

const noop = () => Promise.resolve(undefined);

/**
 * A null-object proxy: any property access returns the proxy itself, and
 * calling the proxy (or any method on it) resolves to `undefined`. Used so
 * that `ictx` (the interaction context) is safe to call from a *prefix*
 * command's execute — `await ictx.reply('hi')` simply bypasses rather than
 * throwing, and chained access like `ctx.channel.send(...)` is safe too.
 * Symbols and `then` are excluded so the proxy is not thenable.
 */
export function createBypassProxy<T>(): T {
  const proxy = new Proxy(noop, {
    get(_target, prop) {
      if (prop === 'then') return undefined;
      if (typeof prop === 'symbol') return undefined;
      return proxy;
    },
    apply() {
      return Promise.resolve(undefined);
    },
  });
  return proxy as unknown as T;
}

export interface CommandSendOptions {
  ephemeral?: boolean;
  [key: string]: unknown;
}

/**
 * Unified command context — always present for both slash and prefix
 * commands. Provides `author`, `member`, `guild`, `channel`, `reply`, and
 * `send`. `channel` resolves to a bypass proxy when unavailable (e.g. a DM
 * slash command), so `ctx.channel.send(...)` never throws. `message` is the
 * raw Message for prefix commands and `null` for slash.
 */
export class CommandContext {
  readonly source: 'slash' | 'prefix';
  readonly message: Message | null;
  readonly interaction: ChatInputCommandInteraction | null;
  private readonly backingChannel: TextBasedChannel | null;

  private constructor(
    source: 'slash' | 'prefix',
    message: Message | null,
    interaction: ChatInputCommandInteraction | null,
    channel: TextBasedChannel | null,
  ) {
    this.source = source;
    this.message = message;
    this.interaction = interaction;
    this.backingChannel = channel;
  }

  static fromMessage(message: Message): CommandContext {
    return new CommandContext('prefix', message, null, message.channel ?? null);
  }

  static fromInteraction(interaction: ChatInputCommandInteraction): CommandContext {
    return new CommandContext('slash', null, interaction, interaction.channel ?? null);
  }

  get isSlash(): boolean {
    return this.source === 'slash';
  }

  get isPrefix(): boolean {
    return this.source === 'prefix';
  }

  get author(): User {
    if (this.message) return this.message.author;
    return this.interaction!.user;
  }

  get member(): GuildMember | null {
    if (this.message) return this.message.member ?? null;
    return (this.interaction!.member as GuildMember | null) ?? null;
  }

  get guild(): Guild | null {
    if (this.message) return this.message.guild;
    return this.interaction!.guild ?? null;
  }

  get guildId(): string | null {
    if (this.message) return this.message.guildId ?? null;
    return this.interaction!.guildId ?? null;
  }

  /** The channel, or a bypass proxy when no channel is available. */
  get channel(): TextBasedChannel {
    return this.backingChannel ?? (createBypassProxy<TextBasedChannel>() as TextBasedChannel);
  }

  async reply(content: string, options: CommandSendOptions = {}): Promise<Message | void> {
    const payload = { content, ...options };
    if (this.interaction) {
      await this.interaction.reply(payload as Parameters<ChatInputCommandInteraction['reply']>[0]);
      return;
    }
    if (this.message) {
      return await this.message.reply(payload as Parameters<Message['reply']>[0]);
    }
  }

  /** Sends to the backing channel; bypasses (no-op) when there is none. */
  async send(content: string, options: CommandSendOptions = {}): Promise<Message | void> {
    const channel = this.backingChannel;
    if (!channel || !('send' in channel)) return;
    return await channel.send({ content, ...options } as Parameters<typeof channel.send>[0]);
  }
}

export type InteractionContext = ChatInputCommandInteraction;
