import { describe, it, expect } from 'vitest';
import type { GuildMember } from 'discord.js';
import {
  defineConfig,
  createMessageResolver,
  checkPermissions,
  type AppConfig,
} from '../src/index.js';

function env(overrides: Record<string, string | undefined> = {}) {
  return {
    DISCORD_TOKEN: 'mock-token',
    DISCORD_CLIENT_ID: '123456789012345678',
    DISCORD_GUILD_IDS: 'dev-guild',
    BOT_OWNER_IDS: 'owner-id',
    ...overrides,
  };
}

function makeConfig(): AppConfig {
  return defineConfig({ env: env() });
}

function memberWithRoles(...roleIds: string[]): GuildMember {
  return {
    roles: { cache: { has: (id: string) => roleIds.includes(id) } },
  } as unknown as GuildMember;
}

describe('checkPermissions', () => {
  const config = makeConfig();
  const t = createMessageResolver(config.messages);

  it('allows when no permissions are configured', () => {
    const result = checkPermissions(null, 'anyone', 'g', undefined, config, t);
    expect(result.allowed).toBe(true);
  });

  it('denies owner-only commands for non-owners', () => {
    const result = checkPermissions(null, 'stranger', 'g', { ownerOnly: true }, config, t);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(config.messages.guardOwnerOnly);
  });

  it('allows owner-only commands for configured owners', () => {
    const result = checkPermissions(null, 'owner-id', 'g', { ownerOnly: true }, config, t);
    expect(result.allowed).toBe(true);
  });

  it('denies dev-only commands outside the dev guild', () => {
    const result = checkPermissions(null, 'owner-id', 'other-guild', { devOnly: true }, config, t);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(config.messages.guardDevOnly);
  });

  it('allows dev-only commands inside the dev guild', () => {
    const result = checkPermissions(null, 'owner-id', 'dev-guild', { devOnly: true }, config, t);
    expect(result.allowed).toBe(true);
  });

  it('denies blacklisted users', () => {
    const result = checkPermissions(null, 'baddy', 'g', { blacklistedUsers: ['baddy'] }, config, t);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(config.messages.guardBlacklisted);
  });

  it('denies when an allowed role is missing', () => {
    const result = checkPermissions(
      memberWithRoles('mod'),
      'u',
      'g',
      { allowedRoles: ['admin'] },
      config,
      t,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(config.messages.guardMissingRole);
  });

  it('allows when the member has an allowed role', () => {
    const result = checkPermissions(
      memberWithRoles('mod'),
      'u',
      'g',
      { allowedRoles: ['mod'] },
      config,
      t,
    );
    expect(result.allowed).toBe(true);
  });

  it('denies blacklisted roles', () => {
    const result = checkPermissions(
      memberWithRoles('muted'),
      'u',
      'g',
      { blacklistedRoles: ['muted'] },
      config,
      t,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(config.messages.guardBlacklisted);
  });
});
