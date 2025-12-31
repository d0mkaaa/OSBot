import { DatabaseManager } from '../database/Database.js';

interface AnalyticsData {
  guildId: string;
  metricType: string;
  value: number;
  metadata?: Record<string, any>;
}

export class AnalyticsTracker {
  private static instance: AnalyticsTracker | null = null;
  private db: DatabaseManager;
  private aggregationBuffer: Map<string, AnalyticsData[]> = new Map();
  private aggregationInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.db = DatabaseManager.getInstance();
    this.startAggregation();
  }

  public static getInstance(): AnalyticsTracker {
    if (!AnalyticsTracker.instance) {
      AnalyticsTracker.instance = new AnalyticsTracker();
    }
    return AnalyticsTracker.instance;
  }

  private startAggregation() {
    this.aggregationInterval = setInterval(() => {
      this.flushMetrics();
    }, 10000);
  }

  public isAnalyticsEnabled(guildId: string): boolean {
    try {
      const guild = this.db.getGuild(guildId);
      return !!(guild as any)?.analytics_enabled;
    } catch {
      return false;
    }
  }

  public trackMessage(guildId: string, userId: string, channelId: string) {
    const enabled = this.isAnalyticsEnabled(guildId);
    if (!enabled) {
      return;
    }

    this.incrementMetric(guildId, 'messages', 1);
    this.incrementUserActivity(guildId, userId, 1);
    this.incrementChannelActivity(guildId, channelId, 1);
  }

  public trackCommand(guildId: string, commandName: string) {
    if (!this.isAnalyticsEnabled(guildId)) return;

    this.incrementMetric(guildId, 'commands', 1);
  }

  public trackMemberJoin(guildId: string) {
    if (!this.isAnalyticsEnabled(guildId)) return;

    this.incrementMetric(guildId, 'joins', 1);
  }

  public trackMemberLeave(guildId: string) {
    if (!this.isAnalyticsEnabled(guildId)) return;

    this.incrementMetric(guildId, 'leaves', 1);
  }

  public trackModerationAction(guildId: string, actionType: string) {
    if (!this.isAnalyticsEnabled(guildId)) return;

    this.incrementMetric(guildId, 'moderation_actions', 1);
  }

  private incrementMetric(guildId: string, metricType: string, value: number) {
    const key = `${guildId}:${metricType}`;
    const existing = this.aggregationBuffer.get(key) || [];

    const now = Math.floor(Date.now() / 1000);
    const timeBucket = Math.floor(now / 3600) * 3600;

    const existingBucket = existing.find(m =>
      m.metricType === metricType && m.metadata?.time_bucket === timeBucket
    );
    if (existingBucket) {
      existingBucket.value += value;
    } else {
      existing.push({
        guildId,
        metricType,
        value,
        metadata: { time_bucket: timeBucket }
      });
    }

    this.aggregationBuffer.set(key, existing);
  }

  private incrementUserActivity(guildId: string, userId: string, count: number) {
    const key = `${guildId}:user_activity`;
    const existing = this.aggregationBuffer.get(key) || [];

    const existingMetric = existing.find(m => m.metricType === 'user_activity');
    if (existingMetric) {
      if (!existingMetric.metadata) existingMetric.metadata = {};
      existingMetric.metadata[userId] = (existingMetric.metadata[userId] || 0) + count;
    } else {
      existing.push({
        guildId,
        metricType: 'user_activity',
        value: count,
        metadata: { [userId]: count }
      });
    }

    this.aggregationBuffer.set(key, existing);
  }

  private incrementChannelActivity(guildId: string, channelId: string, count: number) {
    const key = `${guildId}:channel_activity`;
    const existing = this.aggregationBuffer.get(key) || [];

    const existingMetric = existing.find(m => m.metricType === 'channel_activity');
    if (existingMetric) {
      if (!existingMetric.metadata) existingMetric.metadata = {};
      existingMetric.metadata[channelId] = (existingMetric.metadata[channelId] || 0) + count;
    } else {
      existing.push({
        guildId,
        metricType: 'channel_activity',
        value: count,
        metadata: { [channelId]: count }
      });
    }

    this.aggregationBuffer.set(key, existing);
  }

  private flushMetrics() {
    for (const [key, metrics] of this.aggregationBuffer.entries()) {
      for (const metric of metrics) {
        try {
          const now = Math.floor(Date.now() / 1000);
          const timeBucket = metric.metadata?.time_bucket || Math.floor(now / 3600) * 3600;

          const metadataStr = metric.metadata ? JSON.stringify(metric.metadata) : null;

          this.db.upsertAnalytics(
            metric.guildId,
            metric.metricType,
            timeBucket,
            metric.value,
            metadataStr
          );
        } catch (error) {
          console.error('Failed to flush metric:', error);
        }
      }
    }

    this.aggregationBuffer.clear();
  }

  public shutdown() {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
    this.flushMetrics();
  }
}
