import { describe, it, expect, vi } from 'vitest';
import type { ChatInputCommandInteraction, Message } from 'discord.js';
import { CommandContext, createBypassProxy } from '../src/index.js';

describe('createBypassProxy', () => {
  it('makes any awaited method call resolve to undefined', async () => {
    const proxy = createBypassProxy<{ reply: (m: string) => Promise<string> }>();
    await expect(proxy.reply('hi')).resolves.toBeUndefined();
  });

  it('does not throw on arbitrary chained property access', () => {
    const proxy = createBypassProxy<{ foo: { bar: () => void } }>();
    expect(() => proxy.foo.bar()).not.toThrow();
  });

  it('is not thenable (so await on the proxy itself is safe)', () => {
    const proxy = createBypassProxy<unknown>();
    expect((proxy as { then?: unknown }).then).toBeUndefined();
  });
});

describe('CommandContext', () => {
  it('wraps a prefix message and exposes derived fields', () => {
    const fakeChannel = { id: 'c1', send: vi.fn().mockResolvedValue(undefined) };
    const fakeMessage = {
      author: { id: 'u1' },
      member: { id: 'u1' },
      guild: { id: 'g1' },
      guildId: 'g1',
      channel: fakeChannel,
    } as unknown as Message;

    const ctx = CommandContext.fromMessage(fakeMessage);
    expect(ctx.isPrefix).toBe(true);
    expect(ctx.isSlash).toBe(false);
    expect(ctx.message).toBe(fakeMessage);
    expect(ctx.author.id).toBe('u1');
    expect(ctx.guildId).toBe('g1');
    expect(ctx.guild?.id).toBe('g1');
    expect(ctx.channel.id).toBe('c1');
  });

  it('send() bypasses (no-op) when the slash interaction has no channel', async () => {
    const fakeInteraction = {
      user: { id: 'u2' },
      guild: null,
      guildId: null,
      channel: null,
      member: null,
      reply: vi.fn(),
    } as unknown as ChatInputCommandInteraction;

    const ctx = CommandContext.fromInteraction(fakeInteraction);
    expect(ctx.isSlash).toBe(true);
    expect(ctx.author.id).toBe('u2');
    await expect(ctx.send('hi')).resolves.toBeUndefined();
    expect(ctx.guildId).toBeNull();
  });
});
