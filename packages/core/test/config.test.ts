import { describe, it, expect, vi } from 'vitest';
import {
  defaultEnvSchema,
  parseEnv,
  defineConfig,
  defaultMessages,
  formatMessage,
  createMessageResolver,
  resolveCooldown,
  cooldownMessageVars,
} from '../src/index.js';

function validEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    DISCORD_TOKEN: 'mock-token',
    DISCORD_CLIENT_ID: '123456789012345678',
    ...overrides,
  };
}

describe('parseEnv', () => {
  it('returns parsed data when env is valid', () => {
    const result = parseEnv(defaultEnvSchema, validEnv());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.DISCORD_TOKEN).toBe('mock-token');
      expect(result.data.DISCORD_CLIENT_ID).toBe('123456789012345678');
    }
  });

  it('returns error lines when env is invalid', () => {
    const result = parseEnv(defaultEnvSchema, {
      DISCORD_TOKEN: '',
      DISCORD_CLIENT_ID: 'not-a-snowflake',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0);
      expect(result.error.some((l) => l.includes('DISCORD_TOKEN'))).toBe(true);
      expect(result.error.some((l) => l.includes('DISCORD_CLIENT_ID'))).toBe(true);
    }
  });
});

describe('defineConfig', () => {
  it('applies sensible defaults', () => {
    const config = defineConfig({ env: validEnv() });
    expect(config.token).toBe('mock-token');
    expect(config.prefix).toBeNull();
    expect(config.cooldownBackend).toBe('memory');
    expect(config.commandRegistration).toBe('guild');
    expect(config.logLevel).toBe('info');
    expect(config.ownerIds).toEqual([]);
    expect(config.guildIds).toEqual([]);
    expect(config.totalShards).toBe('auto');
    expect(config.componentStateSecret).toBe('mock-token');
  });

  it('parses comma-separated guild and owner ids', () => {
    const config = defineConfig({
      env: validEnv({
        DISCORD_GUILD_IDS: '111,222 , 333',
        BOT_OWNER_IDS: ' 444,555 ',
      }),
    });
    expect(config.guildIds).toEqual(['111', '222', '333']);
    expect(config.ownerIds).toEqual(['444', '555']);
    expect(config.guildId).toBe('111');
  });

  it('falls back to DISCORD_GUILD_ID when DISCORD_GUILD_IDS is absent', () => {
    const config = defineConfig({ env: validEnv({ DISCORD_GUILD_ID: '999' }) });
    expect(config.guildIds).toEqual(['999']);
  });

  it('merges message overrides over defaults', () => {
    const config = defineConfig({
      env: validEnv(),
      messages: { commandCooldown: 'wait {seconds}s please' },
    });
    expect(config.messages.commandCooldown).toBe('wait {seconds}s please');
    expect(config.messages.commandError).toBe(defaultMessages.commandError);
  });

  it('accepts explicit prefix and cooldown backend overrides', () => {
    const config = defineConfig({
      env: validEnv(),
      prefix: '!',
      cooldownBackend: 'postgres',
      commandRegistration: 'global',
      logLevel: 'warn',
    });
    expect(config.prefix).toBe('!');
    expect(config.cooldownBackend).toBe('postgres');
    expect(config.commandRegistration).toBe('global');
    expect(config.logLevel).toBe('warn');
  });

  it('normalizes a "none" cooldown backend to memory', () => {
    const config = defineConfig({
      env: validEnv(),
      cooldownBackend: 'none',
    });
    expect(config.cooldownBackend).toBe('memory');
  });

  it('parses total shards as a positive integer or auto', () => {
    const config = defineConfig({
      env: validEnv({ DISCORD_TOTAL_SHARDS: '4' }),
    });
    expect(config.totalShards).toBe(4);
  });
});

describe('resolveCooldown', () => {
  it('converts each unit to milliseconds', () => {
    expect(resolveCooldown({ seconds: 30 })).toBe(30_000);
    expect(resolveCooldown({ minutes: 1 })).toBe(60_000);
    expect(resolveCooldown({ hours: 1 })).toBe(3_600_000);
    expect(resolveCooldown({ days: 1 })).toBe(86_400_000);
  });

  it('sums mixed units', () => {
    expect(resolveCooldown({ hours: 1, minutes: 5, seconds: 30 })).toBe(3_930_000);
  });

  it('returns 0 when empty', () => {
    expect(resolveCooldown({})).toBe(0);
  });
});

describe('cooldownMessageVars', () => {
  it('produces a numeric unix expiry and formatted seconds', () => {
    const fixed = 1_700_000_000_000;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixed);
    try {
      const vars = cooldownMessageVars(15_000);
      expect(vars.seconds).toBe('15.0');
      expect(vars.unix).toBe(String(Math.floor((fixed + 15_000) / 1000)));
    } finally {
      nowSpy.mockRestore();
    }
  });
});

describe('formatMessage', () => {
  it('interpolates {variables}', () => {
    expect(formatMessage('hi {name}!', { name: 'world' })).toBe('hi world!');
  });

  it('replaces missing variables with empty string', () => {
    expect(formatMessage('a {x} b', {})).toBe('a  b');
  });
});

describe('createMessageResolver', () => {
  it('resolves keys with overridden templates', () => {
    const t = createMessageResolver({ ...defaultMessages, commandError: 'boom' });
    expect(t('commandError')).toBe('boom');
  });

  it('interpolates the cooldown template with timestamp vars', () => {
    const t = createMessageResolver(defaultMessages);
    const out = t('commandCooldown', { unix: '1700000015', seconds: '15.0' });
    expect(out).toBe('You are on cooldown. Try again <t:1700000015:R> (15.0s left).');
  });
});
