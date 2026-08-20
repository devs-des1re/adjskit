import { createHmac, timingSafeEqual } from 'node:crypto';
import process from 'node:process';

export type CustomIdVarValue = string | number | boolean | null | undefined;

export interface CustomIdOptions {
  /** Seconds from now before the custom id expires. */
  expiresIn?: number;
  /** Restrict use to one Discord user id. */
  userId?: string;
  /** Restrict use to one Discord guild id. */
  guildId?: string;
}

export interface CustomIdParseContext {
  userId?: string;
  guildId?: string | null;
}

export interface CustomIdScope {
  expiresAt?: number;
  userId?: string;
  guildId?: string;
}

export interface ParsedCustomId {
  base: string;
  params: string[];
  valid: boolean;
  reason?: string;
  expired?: boolean;
  scope?: CustomIdScope;
}

const MAX_CUSTOM_ID_LENGTH = 100;
const BASE36_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

// Module-level codec configuration (secret for signing). Set via
// `configureCustomIdCodec`; defaults to unsigned when no secret is configured.
let codecSecret: string | undefined;

export function configureCustomIdCodec(options: { secret?: string } = {}): void {
  codecSecret = options.secret;
}

function encodeBase36(value: bigint | number): string {
  const bi = typeof value === 'number' ? BigInt(Math.trunc(value)) : value;
  if (bi === 0n) return '0';
  let result = '';
  let n = bi;
  const negative = n < 0n;
  if (negative) n = -n;
  while (n > 0n) {
    result = BASE36_ALPHABET[Number(n % 36n)] + result;
    n /= 36n;
  }
  return negative ? `-${result}` : result;
}

function decodeBase36ToBigInt(value: string): bigint {
  let result = 0n;
  let negative = false;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!.toLowerCase();
    if (i === 0 && ch === '-') {
      negative = true;
      continue;
    }
    const digit = BASE36_ALPHABET.indexOf(ch);
    if (digit === -1) break;
    result = result * 36n + BigInt(digit);
  }
  return negative ? -result : result;
}

/** Encodes a single param value compactly: numeric -> base36 (prefixed `!`), else escaped raw. */
function encodeValue(value: CustomIdVarValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return `!${encodeBase36(value)}`;
  if (typeof value === 'boolean') return value ? '1' : '0';
  const str = String(value);
  if (/^\d+$/.test(str) && str.length > 1) return `!${encodeBase36(BigInt(str))}`;
  return escapeValue(str);
}

function decodeValue(raw: string): string {
  if (raw === '') return '';
  if (raw[0] === '!') {
    return decodeBase36ToBigInt(raw.slice(1)).toString();
  }
  return unescapeValue(raw);
}

const SPECIAL_CHARS = [':', '@', '.', ';', '!', '\\'] as const;

function escapeValue(value: string): string {
  let result = '';
  for (const ch of value) {
    if ((SPECIAL_CHARS as readonly string[]).includes(ch)) result += '\\';
    result += ch;
  }
  return result;
}

function unescapeValue(value: string): string {
  let result = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!;
    if (ch === '\\' && i + 1 < value.length) {
      result += value[i + 1] ?? '';
      i++;
    } else {
      result += ch;
    }
  }
  return result;
}

/** Splits `str` on `delim`, ignoring backslash-escaped occurrences. */
function splitUnescaped(str: string, delim: string): string[] {
  const parts: string[] = [];
  let current = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]!;
    if (ch === '\\' && i + 1 < str.length) {
      current += ch;
      current += str[i + 1] ?? '';
      i++;
      continue;
    }
    if (ch === delim) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

function sign(message: string, secret: string): string {
  const digest = createHmac('sha256', secret).update(message).digest();
  return digest.readUInt32BE(0).toString(36);
}

function signaturesMatch(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function warnIfTooLong(customId: string): void {
  if (customId.length > MAX_CUSTOM_ID_LENGTH && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[adjskit/customId] Built customId "${customId.slice(0, 32)}..." is ${customId.length} chars, exceeding Discord's ${MAX_CUSTOM_ID_LENGTH}-char limit.`,
    );
  }
}

/**
 * Builds a compact, optionally-signed custom id. Param values that look like
 * snowflakes (all-digit strings) or numbers are base36-encoded (prefixed `!`)
 * to save space; other strings are escaped. Optional expiry/user/guild
 * scoping is appended after `@`; an HMAC signature (truncated to ~7 base36
 * chars) is appended after `.` when a secret is configured.
 *
 * Format: `base:p1:pN[@eE;uU;gG][.sig]`
 */
export function buildCustomId(
  base: string,
  params: Record<string, CustomIdVarValue> = {},
  options: CustomIdOptions = {},
  codec: { secret?: string } = { secret: codecSecret },
): string {
  const paramValues = Object.values(params).map(encodeValue);
  const paramsPart = paramValues.length > 0 ? `:${paramValues.join(':')}` : '';

  let scopePart = '';
  const scopeTokens: string[] = [];
  if (options.expiresIn !== undefined) {
    scopeTokens.push(`e${encodeBase36(Math.floor(Date.now() / 1000) + options.expiresIn)}`);
  }
  if (options.userId) scopeTokens.push(`u${encodeBase36(BigInt(options.userId))}`);
  if (options.guildId) scopeTokens.push(`g${encodeBase36(BigInt(options.guildId))}`);
  if (scopeTokens.length > 0) scopePart = `@${scopeTokens.join(';')}`;

  const message = `${base}${paramsPart}${scopePart}`;
  const secret = codec.secret;
  const signaturePart = secret ? `.${sign(message, secret)}` : '';
  const result = `${message}${signaturePart}`;
  warnIfTooLong(result);
  return result;
}

/**
 * Parses a built custom id, verifying its signature (when a secret is
 * configured) and enforcing expiry / user / guild scope. Returns the decoded
 * positional param values; the handler zips them with the component's
 * declared param names.
 */
export function parseCustomId(
  raw: string,
  context: CustomIdParseContext = {},
  codec: { secret?: string } = { secret: codecSecret },
): ParsedCustomId {
  const secret = codec.secret;

  let message: string;
  let signature: string | null = null;
  if (secret) {
    const dotParts = splitUnescaped(raw, '.');
    if (dotParts.length === 2) {
      message = dotParts[0] ?? raw;
      signature = dotParts[1] ?? '';
      if (!signaturesMatch(signature, sign(message, secret))) {
        return { base: extractBase(raw), params: [], valid: false, reason: 'signature' };
      }
    } else {
      // A secret is configured but the custom id carries no signature.
      return { base: extractBase(raw), params: [], valid: false, reason: 'signature' };
    }
  } else {
    message = raw;
  }

  const atParts = splitUnescaped(message, '@');
  const paramsPart = atParts[0] ?? message;
  const scopePart = atParts.length === 2 ? (atParts[1] ?? '') : '';

  const parts = splitUnescaped(paramsPart, ':');
  const base = parts[0] ?? raw;
  const params = parts.slice(1).map(decodeValue);

  let scope: CustomIdScope | undefined;
  if (scopePart) {
    scope = {};
    for (const token of scopePart.split(';')) {
      const key = token[0];
      const value = token.slice(1);
      if (key === 'e') scope.expiresAt = Number(decodeBase36ToBigInt(value));
      else if (key === 'u') scope.userId = decodeBase36ToBigInt(value).toString();
      else if (key === 'g') scope.guildId = decodeBase36ToBigInt(value).toString();
    }

    if (scope.expiresAt !== undefined && Math.floor(Date.now() / 1000) > scope.expiresAt) {
      return { base, params, valid: false, reason: 'expired', expired: true, scope };
    }
    if (scope.userId && context.userId && scope.userId !== context.userId) {
      return { base, params, valid: false, reason: 'wrongUser', scope };
    }
    if (scope.guildId && context.guildId && scope.guildId !== context.guildId) {
      return { base, params, valid: false, reason: 'wrongGuild', scope };
    }
  }

  return { base: base ?? raw, params, valid: true, scope };
}

function extractBase(raw: string): string {
  const noSig = splitUnescaped(raw, '.')[0] ?? raw;
  const noScope = splitUnescaped(noSig, '@')[0] ?? noSig;
  return splitUnescaped(noScope, ':')[0] ?? raw;
}
