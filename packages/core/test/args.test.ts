import { describe, it, expect, vi } from 'vitest';
import { Collection } from 'discord.js';
import type { ChatInputCommandInteraction, Guild, Message } from 'discord.js';
import {
  ParamType,
  extractSlashArgs,
  resolvePrefixArgs,
  defaultMessages,
  createMessageResolver,
  type ParamDescriptor,
} from '../src/index.js';

function params(...items: Array<[string, ParamType, boolean?]>): ParamDescriptor[] {
  return items.map(([name, type, required]) => ({ name, type, required: required ?? false }));
}

describe('extractSlashArgs', () => {
  it('reads each param type from the interaction options', () => {
    const options = {
      getString: vi.fn((n: string) => (n === 'name' ? 'bob' : null)),
      getInteger: vi.fn(() => 5),
      getNumber: vi.fn(() => 1.5),
      getBoolean: vi.fn(() => true),
      getUser: vi.fn(() => ({ id: '111' })),
      getChannel: vi.fn(() => ({ id: '222' })),
      getRole: vi.fn(() => ({ id: '333' })),
      getMentionable: vi.fn(() => ({ id: '444' })),
      getAttachment: vi.fn(() => ({ id: '555' })),
    };
    const interaction = { options } as unknown as ChatInputCommandInteraction;

    const allParams: ParamDescriptor[] = [
      { name: 'name', type: ParamType.String, required: false },
      { name: 'count', type: ParamType.Integer, required: false },
      { name: 'rate', type: ParamType.Number, required: false },
      { name: 'flag', type: ParamType.Boolean, required: false },
      { name: 'user', type: ParamType.User, required: false },
      { name: 'channel', type: ParamType.Channel, required: false },
      { name: 'role', type: ParamType.Role, required: false },
      { name: 'mention', type: ParamType.Mentionable, required: false },
      { name: 'file', type: ParamType.Attachment, required: false },
    ];

    const args = extractSlashArgs(interaction, allParams);

    expect(args.name).toBe('bob');
    expect(args.count).toBe(5);
    expect(args.rate).toBe(1.5);
    expect(args.flag).toBe(true);
    expect((args.user as { id: string }).id).toBe('111');
    expect((args.channel as { id: string }).id).toBe('222');
    expect((args.role as { id: string }).id).toBe('333');
    expect((args.mention as { id: string }).id).toBe('444');
    expect((args.file as { id: string }).id).toBe('555');
  });
});

describe('resolvePrefixArgs', () => {
  const mockUser = { id: '111', username: 'bob' };
  const mockMember = { user: mockUser, id: '111' };
  const mockChannel = { id: '222', name: 'general' };
  const mockRole = { id: '333', name: 'Member' };
  const t = createMessageResolver(defaultMessages);

  function mockGuild(): Guild {
    const membersFetch = vi.fn(async (arg: string | { query: string }) => {
      if (typeof arg === 'string') return mockMember;
      return new Collection([['111', mockMember]]);
    });
    return {
      channels: {
        cache: new Collection([['222', mockChannel]]),
        fetch: vi.fn().mockResolvedValue(mockChannel),
      },
      roles: { cache: new Collection([['333', mockRole]]) },
      members: { fetch: membersFetch },
    } as unknown as Guild;
  }

  function mockMessage(
    content: string,
    guild: Guild,
    attachments = new Collection<string, unknown>(),
  ): Message {
    return {
      content,
      author: { id: '999' },
      member: mockMember,
      guild,
      channel: { send: vi.fn() },
      reply: vi.fn(),
      attachments,
      guildId: 'g1',
    } as unknown as Message;
  }

  it('resolves mentions and ids into the same objects slash provides', async () => {
    const guild = mockGuild();
    const message = mockMessage('!ban <@!111> general <@&333>', guild);
    const resolved = await resolvePrefixArgs(
      message,
      ['<@!111>', 'general', '<@&333>'],
      params(['user', ParamType.User], ['channel', ParamType.Channel], ['role', ParamType.Role]),
      guild,
      1,
      t,
    );
    expect(resolved).not.toBeNull();
    expect((resolved!.user as { id: string }).id).toBe('111');
    expect((resolved!.channel as { id: string }).id).toBe('222');
    expect((resolved!.role as { id: string }).id).toBe('333');
  });

  it('parses integer and number tokens', async () => {
    const guild = mockGuild();
    const message = mockMessage('!add 5 1.5', guild);
    const resolved = await resolvePrefixArgs(
      message,
      ['5', '1.5'],
      params(['n', ParamType.Integer], ['r', ParamType.Number]),
      guild,
      1,
      t,
    );
    expect(resolved!.n).toBe(5);
    expect(resolved!.r).toBe(1.5);
  });

  it('parses boolean tokens flexibly', async () => {
    const guild = mockGuild();
    const message = mockMessage('!set on', guild);
    const resolved = await resolvePrefixArgs(
      message,
      ['on'],
      params(['flag', ParamType.Boolean]),
      guild,
      1,
      t,
    );
    expect(resolved!.flag).toBe(true);
  });

  it('replies and returns null on a missing required argument', async () => {
    const guild = mockGuild();
    const message = mockMessage('!ban', guild);
    const resolved = await resolvePrefixArgs(
      message,
      [],
      params(['user', ParamType.User, true]),
      guild,
      1,
      t,
    );
    expect(resolved).toBeNull();
    expect((message as unknown as { reply: { mockCalls: unknown[][] } }).reply).toHaveBeenCalled();
  });

  it('replies and returns null on an invalid integer', async () => {
    const guild = mockGuild();
    const message = mockMessage('!add abc', guild);
    const resolved = await resolvePrefixArgs(
      message,
      ['abc'],
      params(['n', ParamType.Integer, true]),
      guild,
      1,
      t,
    );
    expect(resolved).toBeNull();
    expect((message as unknown as { reply: { mockCalls: unknown[][] } }).reply).toHaveBeenCalled();
  });

  it('consumes remaining tokens into the last string param', async () => {
    const guild = mockGuild();
    const message = mockMessage('!say hello world foo', guild);
    const resolved = await resolvePrefixArgs(
      message,
      ['hello', 'world', 'foo'],
      params(['first', ParamType.String], ['rest', ParamType.String]),
      guild,
      1,
      t,
    );
    expect(resolved!.first).toBe('hello');
    expect(resolved!.rest).toBe('world foo');
  });
});
