import { GuildMember, Guild } from 'discord.js';
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

      this.joinRecords.delete(member.guild.id);
    }
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
          await channel.send({
            content: `🚨 **Anti-Raid Protection Triggered**\n` +
                    `**Action:** ${action}\n` +
                    `**Users affected:** ${affectedUsers.length}\n` +
                    `**Details:** ${affectedUsers.slice(0, 10).join(', ')}${affectedUsers.length > 10 ? `... and ${affectedUsers.length - 10} more` : ''}`
          });
        }
      } catch (error) {
        logger.error('Failed to log anti-raid action', error);
      }
    }
  }
}

export const antiRaidManager = new AntiRaidManager();
