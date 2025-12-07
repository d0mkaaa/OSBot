import { Guild, User, EmbedBuilder, TextChannel, Colors } from 'discord.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from './logger.js';

export type AuditActionType =
  | 'MEMBER_KICK'
  | 'MEMBER_BAN'
  | 'MEMBER_UNBAN'
  | 'MEMBER_TIMEOUT'
  | 'MEMBER_UNTIMEOUT'
  | 'MEMBER_WARN'
  | 'MEMBER_ROLE_ADD'
  | 'MEMBER_ROLE_REMOVE'
  | 'MESSAGE_DELETE'
  | 'MESSAGE_BULK_DELETE'
  | 'CHANNEL_CREATE'
  | 'CHANNEL_DELETE'
  | 'AUTOMOD_ACTION'
  | 'CONFIG_UPDATE'
  | 'CUSTOM_COMMAND_CREATE'
  | 'CUSTOM_COMMAND_DELETE'
  | 'Channel Locked'
  | 'Channel Unlocked'
  | 'Nickname Changed'
  | 'Nickname Reset'
  | 'Nickname Locked'
  | 'Nickname Unlocked'
  | 'Softban'
  | 'Tempban'
  | 'Unban'
  | 'Voice Mute'
  | 'Voice Deafen'
  | 'Voice Disconnect'
  | 'Voice Move';

interface AuditLogOptions {
  guild: Guild;
  action: AuditActionType;
  moderator: User;
  target?: User | string;
  reason?: string;
  details?: Record<string, any>;
}

export class AuditLogger {
  private db: DatabaseManager;

  constructor() {
    this.db = DatabaseManager.getInstance();
  }

  public async log(options: AuditLogOptions): Promise<void> {
    const { guild, action, moderator, target, reason, details } = options;

    try {
      const targetId = typeof target === 'string' ? target : target?.id || null;
      const detailsJson = details ? JSON.stringify(details) : null;

      this.db.logAction(
        guild.id,
        action,
        moderator.id,
        targetId,
        reason || null,
        detailsJson
      );

      const guildData = this.db.getGuild(guild.id) as any;
      if (guildData?.audit_log_channel_id) {
        await this.sendAuditLogEmbed(guild, guildData.audit_log_channel_id, options);
      }

      logger.info(`Audit log: ${action} by ${moderator.tag} in ${guild.name}`);
    } catch (error) {
      logger.error('Failed to create audit log', error);
    }
  }

  private async sendAuditLogEmbed(guild: Guild, channelId: string, options: AuditLogOptions): Promise<void> {
    try {
      const channel = await guild.channels.fetch(channelId) as TextChannel;
      if (!channel || !channel.isTextBased()) return;

      const { action, moderator, target, reason, details } = options;

      const embed = new EmbedBuilder()
        .setColor(this.getColorForAction(action))
        .setTitle(`${this.getEmojiForAction(action)} ${this.getActionName(action)}`)
        .setTimestamp()
        .addFields(
          { name: '👮 Moderator', value: `${moderator.tag} (${moderator.id})`, inline: true }
        );

      if (target) {
        const targetText = typeof target === 'string'
          ? target
          : `${target.tag} (${target.id})`;
        embed.addFields({ name: '🎯 Target', value: targetText, inline: true });
      }

      if (reason) {
        embed.addFields({ name: '📝 Reason', value: reason });
      }

      if (details) {
        const detailsText = Object.entries(details)
          .map(([key, value]) => `**${key}**: ${value}`)
          .join('\n');
        embed.addFields({ name: '📋 Details', value: detailsText });
      }

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to send audit log embed', error);
    }
  }

  private getColorForAction(action: AuditActionType): number {
    const colors: Record<string, number> = {
      MEMBER_KICK: Colors.Orange,
      MEMBER_BAN: Colors.Red,
      MEMBER_UNBAN: Colors.Green,
      MEMBER_TIMEOUT: Colors.Orange,
      MEMBER_UNTIMEOUT: Colors.Green,
      MEMBER_WARN: Colors.Yellow,
      MEMBER_ROLE_ADD: Colors.Blue,
      MEMBER_ROLE_REMOVE: Colors.DarkBlue,
      MESSAGE_DELETE: Colors.Red,
      MESSAGE_BULK_DELETE: Colors.DarkRed,
      CHANNEL_CREATE: Colors.Green,
      CHANNEL_DELETE: Colors.Red,
      AUTOMOD_ACTION: Colors.Purple,
      CONFIG_UPDATE: Colors.Blue,
      CUSTOM_COMMAND_CREATE: Colors.Green,
      CUSTOM_COMMAND_DELETE: Colors.Red,
      'Channel Locked': Colors.Orange,
      'Channel Unlocked': Colors.Green,
      'Nickname Changed': Colors.Blue,
      'Nickname Reset': Colors.Blue,
      'Nickname Locked': Colors.Orange,
      'Nickname Unlocked': Colors.Green,
      'Softban': Colors.Orange,
      'Tempban': Colors.Orange,
      'Unban': Colors.Green,
      'Voice Mute': Colors.Orange,
      'Voice Deafen': Colors.Orange,
      'Voice Disconnect': Colors.Red,
      'Voice Move': Colors.Blue,
    };
    return colors[action] || Colors.Grey;
  }

  private getEmojiForAction(action: AuditActionType): string {
    const emojis: Record<string, string> = {
      MEMBER_KICK: '👢',
      MEMBER_BAN: '🔨',
      MEMBER_UNBAN: '🔓',
      MEMBER_TIMEOUT: '⏰',
      MEMBER_UNTIMEOUT: '✅',
      MEMBER_WARN: '⚠️',
      MEMBER_ROLE_ADD: '➕',
      MEMBER_ROLE_REMOVE: '➖',
      MESSAGE_DELETE: '🗑️',
      MESSAGE_BULK_DELETE: '🗑️',
      CHANNEL_CREATE: '➕',
      CHANNEL_DELETE: '🗑️',
      AUTOMOD_ACTION: '🛡️',
      CONFIG_UPDATE: '⚙️',
      CUSTOM_COMMAND_CREATE: '➕',
      CUSTOM_COMMAND_DELETE: '➖',
      'Channel Locked': '🔒',
      'Channel Unlocked': '🔓',
      'Nickname Changed': '✏️',
      'Nickname Reset': '🔄',
      'Nickname Locked': '🔒',
      'Nickname Unlocked': '🔓',
      'Softban': '👋',
      'Tempban': '⏱️',
      'Unban': '🔓',
      'Voice Mute': '🔇',
      'Voice Deafen': '🔕',
      'Voice Disconnect': '📵',
      'Voice Move': '➡️',
    };
    return emojis[action] || '📋';
  }

  private getActionName(action: AuditActionType): string {
    const names: Record<string, string> = {
      MEMBER_KICK: 'Member Kicked',
      MEMBER_BAN: 'Member Banned',
      MEMBER_UNBAN: 'Member Unbanned',
      MEMBER_TIMEOUT: 'Member Timed Out',
      MEMBER_UNTIMEOUT: 'Member Timeout Removed',
      MEMBER_WARN: 'Member Warned',
      MEMBER_ROLE_ADD: 'Role Added',
      MEMBER_ROLE_REMOVE: 'Role Removed',
      MESSAGE_DELETE: 'Message Deleted',
      MESSAGE_BULK_DELETE: 'Bulk Message Delete',
      CHANNEL_CREATE: 'Channel Created',
      CHANNEL_DELETE: 'Channel Deleted',
      AUTOMOD_ACTION: 'Auto-Moderation Action',
      CONFIG_UPDATE: 'Configuration Updated',
      CUSTOM_COMMAND_CREATE: 'Custom Command Created',
      CUSTOM_COMMAND_DELETE: 'Custom Command Deleted',
      'Channel Locked': 'Channel Locked',
      'Channel Unlocked': 'Channel Unlocked',
      'Nickname Changed': 'Nickname Changed',
      'Nickname Reset': 'Nickname Reset',
      'Nickname Locked': 'Nickname Locked',
      'Nickname Unlocked': 'Nickname Unlocked',
      'Softban': 'Member Softbanned',
      'Tempban': 'Member Temporarily Banned',
      'Unban': 'Member Unbanned',
      'Voice Mute': 'Voice Muted',
      'Voice Deafen': 'Voice Deafened',
      'Voice Disconnect': 'Voice Disconnected',
      'Voice Move': 'Voice Moved',
    };
    return names[action] || action;
  }
}

export const auditLogger = new AuditLogger();
