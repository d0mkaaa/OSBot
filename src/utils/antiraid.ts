import { GuildMember, Guild, TextChannel, EmbedBuilder } from 'discord.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from './logger.js';

interface JoinRecord {
  userId: string;
  timestamp: number;
}

export class AntiRaidManager {
  private db: DatabaseManager;
  private joinRecords: Map<string, JoinRecord[]>;

  constructor() {
    this.db = DatabaseManager.getInstance();
    this.joinRecords = new Map();

    setInterval(() => {
      const now = Date.now();
      for (const [guildId, records] of this.joinRecords.entries()) {
        const filtered = records.filter(r => now - r.timestamp < 60000);
        if (filtered.length === 0) {
          this.joinRecords.delete(guildId);
        } else {
          this.joinRecords.set(guildId, filtered);
        }
      }
    }, 60000);
  }

  public async checkMemberJoin(member: GuildMember): Promise<void> {
    const guildData = this.db.getGuild(member.guild.id) as any;

    if (!guildData?.antiraid_enabled) return;

    const threshold = guildData.antiraid_join_threshold || 5;
    const windowSeconds = guildData.antiraid_join_window || 10;
    const action = guildData.antiraid_action || 'kick';

    let records = this.joinRecords.get(member.guild.id) || [];
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    records = records.filter(r => now - r.timestamp < windowMs);

    records.push({
      userId: member.id,
      timestamp: now
    });

    this.joinRecords.set(member.guild.id, records);

    if (records.length >= threshold) {
      logger.warn(`Anti-raid triggered in ${member.guild.name}: ${records.length} joins in ${windowSeconds}s`);

      await this.takeAction(member.guild, records, action);
      await this.activateLockdown(member.guild);

      this.joinRecords.delete(member.guild.id);
    }
  }

  public async activateLockdown(guild: Guild): Promise<void> {
    try {
      const guildData = this.db.getGuild(guild.id) as any;

      if (guildData?.raid_lockdown_active === 1) {
        return;
      }

      this.db.updateGuild(guild.id, {
        raid_lockdown_active: 1,
        raid_lockdown_started_at: Math.floor(Date.now() / 1000)
      });

      const logChannel = guildData?.mod_log_channel_id || guildData?.audit_log_channel_id;
      if (logChannel) {
        const channel = await guild.channels.fetch(logChannel).catch(() => null) as TextChannel | null;
        if (channel?.isTextBased()) {
          const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🚨 RAID LOCKDOWN ACTIVATED')
            .setDescription(
              'The server has been placed in lockdown mode due to a detected raid.\n\n' +
              '**What this means:**\n' +
              '• All new joins will be monitored more strictly\n' +
              '• Enhanced security measures are now active\n' +
              '• Use `/antiraid lockdown disable` to manually deactivate\n\n' +
              '**Recommended actions:**\n' +
              '• Review recent joins in audit logs\n' +
              '• Check for suspicious accounts\n' +
              '• Monitor server activity closely'
            )
            .addFields(
              { name: 'Status', value: '🔒 Locked', inline: true },
              { name: 'Activated', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setTimestamp();

          await channel.send({ embeds: [embed] });
        }
      }

      logger.info(`Lockdown activated for guild: ${guild.name} (${guild.id})`);
    } catch (error) {
      logger.error('Failed to activate lockdown:', error);
    }
  }

  public async deactivateLockdown(guild: Guild): Promise<void> {
    try {
      const guildData = this.db.getGuild(guild.id) as any;

      if (guildData?.raid_lockdown_active !== 1) {
        return;
      }

      const lockdownDuration = guildData.raid_lockdown_started_at
        ? Math.floor(Date.now() / 1000) - guildData.raid_lockdown_started_at
        : 0;

      this.db.updateGuild(guild.id, {
        raid_lockdown_active: 0,
        raid_lockdown_started_at: null
      });

      const logChannel = guildData?.mod_log_channel_id || guildData?.audit_log_channel_id;
      if (logChannel) {
        const channel = await guild.channels.fetch(logChannel).catch(() => null) as TextChannel | null;
        if (channel?.isTextBased()) {
          const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ RAID LOCKDOWN DEACTIVATED')
            .setDescription(
              'The server lockdown has been lifted.\n\n' +
              '**Normal operations resumed:**\n' +
              '• Standard security measures are now active\n' +
              '• New members can join normally\n' +
              '• Continue monitoring for any suspicious activity'
            )
            .addFields(
              { name: 'Status', value: '🔓 Unlocked', inline: true },
              { name: 'Lockdown Duration', value: this.formatDuration(lockdownDuration), inline: true }
            )
            .setTimestamp();

          await channel.send({ embeds: [embed] });
        }
      }

      logger.info(`Lockdown deactivated for guild: ${guild.name} (${guild.id})`);
    } catch (error) {
      logger.error('Failed to deactivate lockdown:', error);
    }
  }

  public isLockdownActive(guildId: string): boolean {
    const guildData = this.db.getGuild(guildId) as any;
    return guildData?.raid_lockdown_active === 1;
  }

  public getLockdownStatus(guildId: string): { active: boolean; startedAt: number | null } {
    const guildData = this.db.getGuild(guildId) as any;
    return {
      active: guildData?.raid_lockdown_active === 1,
      startedAt: guildData?.raid_lockdown_started_at || null
    };
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  }

  private async takeAction(guild: Guild, records: JoinRecord[], action: string): Promise<void> {
    const affectedUsers: string[] = [];

    for (const record of records) {
      try {
        const member = await guild.members.fetch(record.userId);

        if (action === 'kick') {
          await member.kick('Anti-raid protection triggered');
          affectedUsers.push(member.user.tag);
        } else if (action === 'ban') {
          await member.ban({ reason: 'Anti-raid protection triggered' });
          affectedUsers.push(member.user.tag);
        }
      } catch (error) {
        logger.error(`Failed to ${action} user ${record.userId}`, error);
      }
    }

    const guildData = this.db.getGuild(guild.id) as any;
    if (guildData?.mod_log_channel_id) {
      try {
        const channel = await guild.channels.fetch(guildData.mod_log_channel_id);
        if (channel?.isTextBased()) {
          const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🚨 Anti-Raid Protection Triggered')
            .setDescription(
              `Mass join detected - automatic action taken.\n\n` +
              `**Action:** ${action}\n` +
              `**Users affected:** ${affectedUsers.length}\n` +
              `**Users:** ${affectedUsers.slice(0, 10).join(', ')}${affectedUsers.length > 10 ? `\n... and ${affectedUsers.length - 10} more` : ''}`
            )
            .setTimestamp();

          await (channel as TextChannel).send({ embeds: [embed] });
        }
      } catch (error) {
        logger.error('Failed to log anti-raid action', error);
      }
    }
  }
}

export const antiRaidManager = new AntiRaidManager();
