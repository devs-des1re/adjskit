import { describe, it, expect } from 'vitest';
import { ApplicationCommandOptionType } from 'discord.js';
import { createCommand, ParamType, buildApplicationCommandData } from '../src/index.js';

describe('createCommand', () => {
  it('builds a descriptor with all configured fields', () => {
    const cmd = createCommand('ban')
      .setDescription('Ban a member')
      .setModule('moderation')
      .setMeta('priority', 'high')
      .setType('both')
      .addAlias('banish')
      .addParam('user', ParamType.User, { required: true })
      .addParam('reason', ParamType.String)
      .setCooldown({ minutes: 5 })
      .setOwnerOnly()
      .setExecute(async (ctx, ictx, args) => {
        void ctx;
        void ictx;
        void args;
      });

    const desc = cmd.build();
    expect(desc.name).toBe('ban');
    expect(desc.type).toBe('both');
    expect(desc.description).toBe('Ban a member');
    expect(desc.module).toBe('moderation');
    expect(desc.metadata).toEqual({ priority: 'high' });
    expect(desc.aliases).toEqual(['banish']);
    expect(desc.params).toHaveLength(2);
    expect(desc.params[0]!.name).toBe('user');
    expect(desc.params[0]!.required).toBe(true);
    expect(desc.params[0]!.type).toBe(ParamType.User);
    expect(desc.params[1]!.required).toBe(false);
    expect(desc.cooldown).toBe(300_000);
    expect(desc.permissions?.ownerOnly).toBe(true);
    expect(typeof desc.execute).toBe('function');
  });

  it('defaults type to "both"', () => {
    const desc = createCommand('ping').setDescription('Pong').build();
    expect(desc.type).toBe('both');
  });

  it('resolves cooldowns across units', () => {
    expect(createCommand('a').setCooldown({ seconds: 30 }).build().cooldown).toBe(30_000);
    expect(createCommand('a').setCooldown({ hours: 1 }).build().cooldown).toBe(3_600_000);
    expect(createCommand('a').setCooldown({ days: 1, hours: 1 }).build().cooldown).toBe(90_000_000);
  });

  it('merges owner-only and dev-only into one permissions object', () => {
    const desc = createCommand('a').setOwnerOnly().setDevOnly().build();
    expect(desc.permissions?.ownerOnly).toBe(true);
    expect(desc.permissions?.devOnly).toBe(true);
  });
});

describe('buildApplicationCommandData', () => {
  it('maps params to application command options with correct types', () => {
    const desc = createCommand('ban')
      .setDescription('Ban a member')
      .addParam('user', ParamType.User, { required: true, description: 'Who to ban' })
      .addParam('reason', ParamType.String, { choices: ['spam', 'toxic'] })
      .addParam('count', ParamType.Integer)
      .build();

    const data = buildApplicationCommandData(desc);
    expect(data.name).toBe('ban');
    expect(data.description).toBe('Ban a member');
    expect(data.options).toHaveLength(3);

    const [userOpt, reasonOpt, countOpt] = data.options!;
    expect(userOpt.type).toBe(ApplicationCommandOptionType.User);
    expect(userOpt.name).toBe('user');
    expect(userOpt.description).toBe('Who to ban');
    expect(userOpt.required).toBe(true);

    expect(reasonOpt.type).toBe(ApplicationCommandOptionType.String);
    expect(reasonOpt.required).toBe(false);

    expect(countOpt.type).toBe(ApplicationCommandOptionType.Integer);
  });

  it('provides a fallback description when none is set', () => {
    const desc = createCommand('ping').build();
    expect(buildApplicationCommandData(desc).description).toBe('No description provided');
  });
});
