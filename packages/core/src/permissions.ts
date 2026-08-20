import type { GuildMember } from 'discord.js';
import type { PermissionConfig } from './types.js';
import type { AppConfig, MessageResolver } from './config/index.js';

export interface AccessResult {
  allowed: boolean;
  /** A formatted, user-facing reason (already resolved via `t`). Null when allowed. */
  reason: string | null;
}

/**
 * Evaluates a {@link PermissionConfig} against the invoker. Owner-only and
 * dev-only checks are user/guild based; role allow/deny lists require a member.
 * Returns the first failure as a localized reason, or `{ allowed: true }`.
 */
export function checkPermissions(
  member: GuildMember | null,
  userId: string,
  guildId: string | null,
  perms: PermissionConfig | undefined,
  config: AppConfig,
  t: MessageResolver,
): AccessResult {
  if (!perms) return { allowed: true, reason: null };

  if (perms.ownerOnly && !config.ownerIds.includes(userId)) {
    return { allowed: false, reason: t('guardOwnerOnly') };
  }
  if (perms.devOnly && guildId && !config.devGuildIds.includes(guildId)) {
    return { allowed: false, reason: t('guardDevOnly') };
  }
  if (perms.blacklistedUsers?.includes(userId)) {
    return { allowed: false, reason: t('guardBlacklisted') };
  }
  if (perms.allowedUsers?.length && !perms.allowedUsers.includes(userId)) {
    return { allowed: false, reason: t('guardNotAllowed') };
  }

  if (member) {
    if (perms.blacklistedRoles?.some((role) => member.roles.cache.has(role))) {
      return { allowed: false, reason: t('guardBlacklisted') };
    }
    if (
      perms.allowedRoles?.length &&
      !perms.allowedRoles.some((role) => member.roles.cache.has(role))
    ) {
      return { allowed: false, reason: t('guardMissingRole') };
    }
  }

  return { allowed: true, reason: null };
}
