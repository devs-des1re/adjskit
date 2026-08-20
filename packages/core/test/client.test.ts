import { describe, it, expect } from 'vitest';
import { Collection, GatewayIntentBits } from 'discord.js';
import { defineConfig, AdjskClient, createBot, resolveIntents } from '../src/index.js';

function env(overrides: Record<string, string | undefined> = {}) {
  return {
    DISCORD_TOKEN: 'mock-token',
    DISCORD_CLIENT_ID: '123456789012345678',
    ...overrides,
  };
}

describe('resolveIntents', () => {
  it('includes MessageContent + GuildMessages when a prefix is configured', () => {
    const config = defineConfig({ env: env(), prefix: '!' });
    const intents = resolveIntents(config);
    expect(intents).toContain('Guilds');
    expect(intents).toContain('GuildMessages');
    expect(intents).toContain('MessageContent');
  });

  it('uses only Guilds when prefix is null (slash-only)', () => {
    const config = defineConfig({ env: env() });
    const intents = resolveIntents(config);
    expect(intents).toEqual(['Guilds']);
  });
});

describe('createBot', () => {
  it('returns an AdjskClient with empty handler collections', () => {
    const config = defineConfig({ env: env(), prefix: '!' });
    const client = createBot({ config });
    expect(client).toBeInstanceOf(AdjskClient);
    expect(client.slashCommands).toBeInstanceOf(Collection);
    expect(client.prefixCommands).toBeInstanceOf(Collection);
    expect(client.buttons).toBeInstanceOf(Collection);
    expect(client.modals).toBeInstanceOf(Collection);
    expect(client.dropdowns).toBeInstanceOf(Collection);
    expect(client.events).toBeInstanceOf(Collection);
    expect(client.slashCommands.size).toBe(0);
  });

  it('derives intents from config when none are passed', () => {
    const config = defineConfig({ env: env(), prefix: '!' });
    const client = createBot({ config });
    expect(client.options.intents.has(GatewayIntentBits.Guilds)).toBe(true);
    expect(client.options.intents.has(GatewayIntentBits.MessageContent)).toBe(true);
  });

  it('accepts an explicit intents override', () => {
    const config = defineConfig({ env: env() });
    const client = createBot({ config, intents: ['Guilds'] });
    expect(client.options.intents.has(GatewayIntentBits.Guilds)).toBe(true);
    expect(client.options.intents.has(GatewayIntentBits.MessageContent)).toBe(false);
  });
});
