import { GuildMember, PermissionFlagsBits, CommandInteraction, ContextMenuCommandInteraction } from 'discord.js';
import { DatabaseManager } from '../database/Database.js';

export function canExecuteCommand(
  interaction: CommandInteraction | ContextMenuCommandInteraction
): boolean {
  if (!interaction.guild || !interaction.member) return true;

  const member = interaction.member as GuildMember;
  const channelId = interaction.channelId;
  const guildId = interaction.guild.id;

  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  const db = DatabaseManager.getInstance();
  const restrictions = db.getCommandRestrictions(guildId);

  if (!restrictions || !restrictions.enabled) {
    return true;
  }

  const blacklistedChannels = restrictions.blacklisted_channels
    ? JSON.parse(restrictions.blacklisted_channels) as string[]
    : [];

  const exceptionRoles = restrictions.exception_roles
    ? JSON.parse(restrictions.exception_roles) as string[]
    : [];

  const exceptionPermissions = restrictions.exception_permissions
    ? JSON.parse(restrictions.exception_permissions) as string[]
    : [];

  const hasExceptionRole = member.roles.cache.some(role => exceptionRoles.includes(role.id));
  if (hasExceptionRole) {
    return true;
  }

  const hasExceptionPermission = exceptionPermissions.some(permission => {
    const permissionFlag = PermissionFlagsBits[permission as keyof typeof PermissionFlagsBits];
    return permissionFlag && member.permissions.has(permissionFlag);
  });
  if (hasExceptionPermission) {
    return true;
  }

  if (blacklistedChannels.includes(channelId)) {
    return false;
  }

  return true;
}
