import { Events, Role, EmbedBuilder, TextChannel } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from '../utils/logger.js';

const event: BotEvent = {
  name: Events.GuildRoleUpdate,

  async execute(oldRole: Role, newRole: Role): Promise<void> {
    const db = DatabaseManager.getInstance();
    const guildData = db.getGuild(newRole.guild.id) as any;

    if (!guildData?.log_role_events || !guildData?.log_channel_id) return;

    const logChannel = await newRole.guild.channels.fetch(guildData.log_channel_id).catch(() => null) as TextChannel | null;
    if (!logChannel?.isTextBased()) return;

    const changes: string[] = [];

    if (oldRole.name !== newRole.name) {
      changes.push(`**Name:** ${oldRole.name} → ${newRole.name}`);
    }

    if (oldRole.color !== newRole.color) {
      changes.push(`**Color:** ${oldRole.hexColor} → ${newRole.hexColor}`);
    }

    if (oldRole.hoist !== newRole.hoist) {
      changes.push(`**Hoisted:** ${oldRole.hoist ? 'Yes' : 'No'} → ${newRole.hoist ? 'Yes' : 'No'}`);
    }

    if (oldRole.mentionable !== newRole.mentionable) {
      changes.push(`**Mentionable:** ${oldRole.mentionable ? 'Yes' : 'No'} → ${newRole.mentionable ? 'Yes' : 'No'}`);
    }

    if (oldRole.position !== newRole.position) {
      changes.push(`**Position:** ${oldRole.position} → ${newRole.position}`);
    }

    const addedPermissions = newRole.permissions.missing(oldRole.permissions);
    const removedPermissions = oldRole.permissions.missing(newRole.permissions);

    if (addedPermissions.length > 0) {
      changes.push(`**Permissions Added:** ${addedPermissions.map(p => `\`${p}\``).join(', ')}`);
    }

    if (removedPermissions.length > 0) {
      changes.push(`**Permissions Removed:** ${removedPermissions.map(p => `\`${p}\``).join(', ')}`);
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setColor(newRole.color || 0xFFA500)
      .setTitle('🎭 Role Updated')
      .addFields(
        { name: '🏷️ Role', value: `${newRole} (${newRole.name})`, inline: true },
        { name: '🆔 ID', value: newRole.id, inline: true },
        { name: '📝 Changes', value: changes.join('\n') }
      )
      .setTimestamp();

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to send role update log', error);
    }
  }
};

export default event;
