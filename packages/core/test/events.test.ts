import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  defineConfig,
  createBot,
  createEvent,
  registerEventHandlers,
  type AdjskClient,
} from '../src/index.js';

function env() {
  return { DISCORD_TOKEN: 'mock-token', DISCORD_CLIENT_ID: '123456789012345678' };
}

describe('createEvent', () => {
  it('builds an event descriptor defaulting to non-once', () => {
    const desc = createEvent('messageDelete')
      .setExecute(async (message) => {
        void message;
      })
      .build();

    expect(desc.name).toBe('messageDelete');
    expect(desc.once).toBe(false);
    expect(typeof desc.execute).toBe('function');
  });

  it('marks the descriptor as once via setOnce()', () => {
    const desc = createEvent('ready')
      .setOnce()
      .setExecute(async (client) => void client)
      .build();
    expect(desc.once).toBe(true);
  });
});

describe('registerEventHandlers', () => {
  let client: AdjskClient;

  beforeEach(() => {
    client = createBot({ config: defineConfig({ env: env(), prefix: '!' }) });
  });

  it('fires a non-once listener on every emit', () => {
    const spy = vi.fn();
    client.events.set('ready', [{ name: 'ready', once: false, execute: spy }]);
    registerEventHandlers(client);

    client.emit('ready', client);
    client.emit('ready', client);

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('fires a once listener only once', () => {
    const spy = vi.fn();
    client.events.set('guildCreate', [{ name: 'guildCreate', once: true, execute: spy }]);
    registerEventHandlers(client);

    client.emit('guildCreate', {});
    client.emit('guildCreate', {});

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('runs multiple listeners sharing one event name', () => {
    const a = vi.fn();
    const b = vi.fn();
    client.events.set('ready', [
      { name: 'ready', once: false, execute: a },
      { name: 'ready', once: false, execute: b },
    ]);
    registerEventHandlers(client);

    client.emit('ready', client);

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('does not crash when a listener rejects', () => {
    client.events.set('ready', [
      {
        name: 'ready',
        once: false,
        execute: async () => {
          throw new Error('boom');
        },
      },
    ]);
    registerEventHandlers(client);

    expect(() => client.emit('ready', client)).not.toThrow();
  });
});
