import { describe, it, expect, beforeEach } from 'vitest';
import { buildCustomId, parseCustomId, configureCustomIdCodec } from '../src/index.js';

describe('customId codec (unsigned)', () => {
  beforeEach(() => configureCustomIdCodec({ secret: undefined }));

  it('round-trips positional params, decoding back to the original values', () => {
    const id = buildCustomId('confirm_ban', { userId: '123456789012345678' });
    const parsed = parseCustomId(id);
    expect(parsed.valid).toBe(true);
    expect(parsed.base).toBe('confirm_ban');
    expect(parsed.params).toEqual(['123456789012345678']);
  });

  it('encodes snowflakes more compactly than raw', () => {
    const raw = '123456789012345678';
    const id = buildCustomId('ban', { userId: raw });
    // base:rawSnowflake would be ~22 chars; base36 encoding is shorter.
    expect(id.length).toBeLessThan(`ban:${raw}`.length);
  });

  it('keeps non-numeric strings as-is (escaped)', () => {
    const id = buildCustomId('nav', { page: 'home' });
    const parsed = parseCustomId(id);
    expect(parsed.params).toEqual(['home']);
  });

  it('escapes delimiter chars inside string params', () => {
    const id = buildCustomId('tag', { content: 'a:b@c' });
    const parsed = parseCustomId(id);
    expect(parsed.params).toEqual(['a:b@c']);
  });

  it('encodes numbers and booleans', () => {
    const id = buildCustomId('cfg', { count: 42, flag: true });
    const parsed = parseCustomId(id);
    expect(parsed.params).toEqual(['42', '1']);
  });

  it('stays under the 100-char Discord limit for a typical button', () => {
    const id = buildCustomId('confirm_action', {
      targetId: '999999999999999999',
      modId: '888888888888888888',
    });
    expect(id.length).toBeLessThanOrEqual(100);
  });
});

describe('customId codec (signed)', () => {
  beforeEach(() => configureCustomIdCodec({ secret: 'super-secret' }));

  it('appends a signature and verifies it on parse', () => {
    const id = buildCustomId('confirm', { userId: '111' });
    expect(id).toContain('.');
    const parsed = parseCustomId(id, { userId: '111' });
    expect(parsed.valid).toBe(true);
    expect(parsed.base).toBe('confirm');
    expect(parsed.params).toEqual(['111']);
  });

  it('rejects a tampered custom id', () => {
    const id = buildCustomId('confirm', { userId: '111' });
    const tampered = id.slice(0, -2) + 'zz';
    const parsed = parseCustomId(tampered, { userId: '111' });
    expect(parsed.valid).toBe(false);
    expect(parsed.reason).toBe('signature');
  });

  it('enforces user scope', () => {
    const id = buildCustomId('confirm', { userId: '111' }, { userId: '111' });
    expect(parseCustomId(id, { userId: '111' }).valid).toBe(true);
    expect(parseCustomId(id, { userId: '222' }).valid).toBe(false);
    expect(parseCustomId(id, { userId: '222' }).reason).toBe('wrongUser');
  });

  it('enforces guild scope', () => {
    const id = buildCustomId('confirm', {}, { guildId: '999' });
    expect(parseCustomId(id, { guildId: '999' }).valid).toBe(true);
    expect(parseCustomId(id, { guildId: '888' }).reason).toBe('wrongGuild');
  });

  it('enforces expiry', () => {
    const id = buildCustomId('confirm', {}, { expiresIn: -10 });
    const parsed = parseCustomId(id);
    expect(parsed.valid).toBe(false);
    expect(parsed.expired).toBe(true);
  });
});
