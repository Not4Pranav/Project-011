import { GuildMember, PermissionsBitField, Role } from 'discord.js';
import { prisma } from '../database/client.js';
import { config } from '../config/index.js';
import { PermissionLevel, PermissionCheckResult } from '../types/index.js';
import { PERMISSION_LEVELS } from '../utils/constants.js';

const permissionCache = new Map<string, { level: PermissionLevel; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getMemberPermissionLevel(member: GuildMember): Promise<PermissionLevel> {
  // Bot owner always has max permission
  if (config.ownerIds.includes(member.id)) {
    return PERMISSION_LEVELS.OWNER;
  }

  // Guild owner has max permission
  if (member.guild.ownerId === member.id) {
    return PERMISSION_LEVELS.OWNER;
  }

  // Check Discord permissions
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return PERMISSION_LEVELS.OWNER;
  }
  if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
    return PERMISSION_LEVELS.ADMIN;
  }

  // Check cached role permissions
  const cacheKey = `${member.guild.id}:${member.id}`;
  const cached = permissionCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.level;
  }

  // Check database for role-based permissions
  const roleIds = member.roles.cache.map(r => r.id);
  const permissionRoles = await prisma.permissionRole.findMany({
    where: {
      guildId: member.guild.id,
      roleId: { in: roleIds },
    },
    orderBy: { level: 'desc' },
  });

  let maxLevel: PermissionLevel = PERMISSION_LEVELS.EVERYONE;
  for (const pr of permissionRoles) {
    if (pr.level > maxLevel) maxLevel = pr.level as PermissionLevel;
  }

  // Cache the result
  permissionCache.set(cacheKey, { level: maxLevel, expires: Date.now() + CACHE_TTL });

  return maxLevel;
}

export async function hasPermission(
  member: GuildMember,
  requiredLevel: PermissionLevel
): Promise<PermissionCheckResult> {
  const userLevel = await getMemberPermissionLevel(member);
  return {
    hasPermission: userLevel >= requiredLevel,
    level: userLevel,
    reason: userLevel < requiredLevel ? `Requires permission level ${requiredLevel}, you have ${userLevel}` : undefined,
  };
}

export function clearPermissionCache(guildId?: string, userId?: string): void {
  if (!guildId && !userId) {
    permissionCache.clear();
    return;
  }

  for (const [key, value] of permissionCache.entries()) {
    const [gId, uId] = key.split(':');
    if ((guildId && gId === guildId) || (userId && uId === userId)) {
      permissionCache.delete(key);
    }
  }
}

export function getPermissionLevelName(level: PermissionLevel): string {
  switch (level) {
    case PERMISSION_LEVELS.EVERYONE:
      return 'Everyone';
    case PERMISSION_LEVELS.MODERATOR:
      return 'Moderator';
    case PERMISSION_LEVELS.ADMIN:
      return 'Admin';
    case PERMISSION_LEVELS.OWNER:
      return 'Owner';
    default:
      return 'Unknown';
  }
}

export function getRequiredPermissions(level: PermissionLevel): bigint[] {
  const perms: bigint[] = [];
  switch (level) {
    case PERMISSION_LEVELS.MODERATOR:
      perms.push(
        PermissionsBitField.Flags.ManageMessages,
        PermissionsBitField.Flags.KickMembers,
        PermissionsBitField.Flags.MuteMembers,
        PermissionsBitField.Flags.ViewAuditLog
      );
      break;
    case PERMISSION_LEVELS.ADMIN:
      perms.push(
        PermissionsBitField.Flags.ManageGuild,
        PermissionsBitField.Flags.BanMembers,
        PermissionsBitField.Flags.ManageRoles,
        PermissionsBitField.Flags.ManageChannels
      );
      break;
    case PERMISSION_LEVELS.OWNER:
      perms.push(PermissionsBitField.Flags.Administrator);
      break;
  }
  return perms;
}

export async function setupDefaultPermissions(guildId: string): Promise<void> {
  const guild = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (!guild) return;

  const existingRoles = await prisma.permissionRole.findMany({ where: { guildId } });
  if (existingRoles.length > 0) return;

  // This would be called after roles are created via /setup
  // The actual role IDs would be passed in from the setup wizard
}

export interface RolePermissionInput {
  roleId: string;
  level: PermissionLevel;
}

export async function setPermissionRoles(guildId: string, roles: RolePermissionInput[]): Promise<void> {
  await prisma.$transaction(
    roles.map(r =>
      prisma.permissionRole.upsert({
        where: { guildId_roleId: { guildId, roleId: r.roleId } },
        update: { level: r.level },
        create: { guildId, roleId: r.roleId, level: r.level },
      })
    )
  );
  clearPermissionCache(guildId);
}

export async function removePermissionRole(guildId: string, roleId: string): Promise<void> {
  await prisma.permissionRole.delete({ where: { guildId_roleId: { guildId, roleId } } });
  clearPermissionCache(guildId);
}

export async function getPermissionRoles(guildId: string): Promise<{ roleId: string; level: PermissionLevel }[]> {
  const roles = await prisma.permissionRole.findMany({ where: { guildId } });
  return roles.map(r => ({ roleId: r.roleId, level: r.level as PermissionLevel }));
}