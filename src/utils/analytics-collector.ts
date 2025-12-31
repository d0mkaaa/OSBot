import { Client } from 'discord.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from './logger.js';

export class AnalyticsCollector {
  private client: Client;
  private db: DatabaseManager;
  private collectionInterval: NodeJS.Timeout | null = null;
  private hourlyBucket: number = 0;

  constructor(client: Client) {
    this.client = client;
    this.db = DatabaseManager.getInstance();
    this.hourlyBucket = this.getCurrentHourBucket();
  }

  private getCurrentHourBucket(): number {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return Math.floor(now.getTime() / 1000);
  }

  public start(): void {
    this.collectionInterval = setInterval(() => {
      this.collectMetrics();
    }, 60 * 60 * 1000);

    logger.info('Analytics collector started');
  }

  public stop(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      logger.info('Analytics collector stopped');
    }
  }

  private collectMetrics(): void {
    try {
      this.hourlyBucket = this.getCurrentHourBucket();

      this.client.guilds.cache.forEach(guild => {
        this.collectGuildMetrics(guild.id);
      });

      logger.debug('Analytics metrics collected');
    } catch (error) {
      logger.error('Failed to collect analytics metrics', error);
    }
  }

  private collectGuildMetrics(guildId: string): void {
    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) return;

      this.db.saveAnalyticsMetric(guildId, 'member_count', this.hourlyBucket, guild.memberCount);

      const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online').size;
      this.db.saveAnalyticsMetric(guildId, 'online_members', this.hourlyBucket, onlineMembers);

      const channelCount = guild.channels.cache.size;
      this.db.saveAnalyticsMetric(guildId, 'channel_count', this.hourlyBucket, channelCount);

      const roleCount = guild.roles.cache.size;
      this.db.saveAnalyticsMetric(guildId, 'role_count', this.hourlyBucket, roleCount);
    } catch (error) {
      logger.error(`Failed to collect metrics for guild ${guildId}`, error);
    }
  }

  public trackMessage(guildId: string): void {
    try {
      this.db.incrementAnalyticsMetric(guildId, 'messages', this.hourlyBucket);
    } catch (error) {
      logger.error(`Failed to track message for guild ${guildId}`, error);
    }
  }

  public trackCommand(guildId: string, commandName: string): void {
    try {
      this.db.incrementAnalyticsMetric(guildId, 'commands', this.hourlyBucket);
      this.db.incrementAnalyticsMetric(
        guildId,
        `command_${commandName}`,
        this.hourlyBucket
      );
    } catch (error) {
      logger.error(`Failed to track command ${commandName} for guild ${guildId}`, error);
    }
  }

  public trackMemberJoin(guildId: string): void {
    try {
      this.db.incrementAnalyticsMetric(guildId, 'joins', this.hourlyBucket);
    } catch (error) {
      logger.error(`Failed to track member join for guild ${guildId}`, error);
    }
  }

  public trackMemberLeave(guildId: string): void {
    try {
      this.db.incrementAnalyticsMetric(guildId, 'leaves', this.hourlyBucket);
    } catch (error) {
      logger.error(`Failed to track member leave for guild ${guildId}`, error);
    }
  }

  public trackModerationAction(guildId: string, actionType: string): void {
    try {
      this.db.incrementAnalyticsMetric(guildId, 'moderation_actions', this.hourlyBucket);
      this.db.incrementAnalyticsMetric(
        guildId,
        `moderation_${actionType}`,
        this.hourlyBucket
      );
    } catch (error) {
      logger.error(`Failed to track moderation action ${actionType} for guild ${guildId}`, error);
    }
  }

  public trackChannelActivity(guildId: string, channelId: string): void {
    try {
      const metadata = JSON.stringify({ channelId });
      const bucket = this.hourlyBucket;

      const existing = this.db.getAnalyticsMetrics(guildId, 'channel_activity', bucket, bucket);
      let channelData: Record<string, number> = {};

      if (existing.length > 0 && (existing[0] as any).metadata) {
        try {
          channelData = JSON.parse((existing[0] as any).metadata);
        } catch {
          channelData = {};
        }
      }

      channelData[channelId] = (channelData[channelId] || 0) + 1;

      this.db.saveAnalyticsMetric(
        guildId,
        'channel_activity',
        bucket,
        Object.values(channelData).reduce((a, b) => a + b, 0),
        JSON.stringify(channelData)
      );
    } catch (error) {
      logger.error(`Failed to track channel activity for ${channelId} in guild ${guildId}`, error);
    }
  }

  public trackUserActivity(guildId: string, userId: string): void {
    try {
      const bucket = this.hourlyBucket;

      const existing = this.db.getAnalyticsMetrics(guildId, 'user_activity', bucket, bucket);
      let userData: Record<string, number> = {};

      if (existing.length > 0 && (existing[0] as any).metadata) {
        try {
          userData = JSON.parse((existing[0] as any).metadata);
        } catch {
          userData = {};
        }
      }

      userData[userId] = (userData[userId] || 0) + 1;

      this.db.saveAnalyticsMetric(
        guildId,
        'user_activity',
        bucket,
        Object.values(userData).reduce((a, b) => a + b, 0),
        JSON.stringify(userData)
      );
    } catch (error) {
      logger.error(`Failed to track user activity for ${userId} in guild ${guildId}`, error);
    }
  }
}
