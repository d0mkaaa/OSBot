import { Router, Request, Response } from 'express';
import { isAuthenticated, hasGuildAccess } from '../middleware/auth-check.js';
import { DatabaseManager } from '../../database/Database.js';

export function createAnalyticsRoutes(client: any): Router {
  const router = Router();
  const db = DatabaseManager.getInstance();

  router.get('/guilds/:guildId/analytics/messages', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { from, to } = req.query;

      const fromTimestamp = from ? parseInt(from as string) : undefined;
      const toTimestamp = to ? parseInt(to as string) : undefined;

      const metrics = db.getAnalyticsMetrics(guildId, 'messages', fromTimestamp, toTimestamp);

      res.json({ success: true, data: metrics });
    } catch (error) {
      console.error('Failed to fetch message analytics:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch message analytics' });
    }
  });

  router.get('/guilds/:guildId/analytics/members', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { from, to } = req.query;

      const fromTimestamp = from ? parseInt(from as string) : undefined;
      const toTimestamp = to ? parseInt(to as string) : undefined;

      const joins = db.getAnalyticsMetrics(guildId, 'joins', fromTimestamp, toTimestamp);
      const leaves = db.getAnalyticsMetrics(guildId, 'leaves', fromTimestamp, toTimestamp);
      const memberCount = db.getAnalyticsMetrics(guildId, 'member_count', fromTimestamp, toTimestamp);

      res.json({ success: true, data: { joins, leaves, memberCount } });
    } catch (error) {
      console.error('Failed to fetch member analytics:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch member analytics' });
    }
  });

  router.get('/guilds/:guildId/analytics/commands', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { from, to } = req.query;

      const fromTimestamp = from ? parseInt(from as string) : undefined;
      const toTimestamp = to ? parseInt(to as string) : undefined;

      const metrics = db.getAnalyticsMetrics(guildId, 'commands', fromTimestamp, toTimestamp);

      res.json({ success: true, data: metrics });
    } catch (error) {
      console.error('Failed to fetch command analytics:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch command analytics' });
    }
  });

  router.get('/guilds/:guildId/analytics/moderation', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { from, to } = req.query;

      const fromTimestamp = from ? parseInt(from as string) : undefined;
      const toTimestamp = to ? parseInt(to as string) : undefined;

      const metrics = db.getAnalyticsMetrics(guildId, 'moderation_actions', fromTimestamp, toTimestamp);

      res.json({ success: true, data: metrics });
    } catch (error) {
      console.error('Failed to fetch moderation analytics:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch moderation analytics' });
    }
  });

  router.get('/guilds/:guildId/analytics/top-users', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { from, to } = req.query;

      const fromTimestamp = from ? parseInt(from as string) : undefined;
      const toTimestamp = to ? parseInt(to as string) : undefined;

      const metrics = db.getAnalyticsMetrics(guildId, 'user_activity', fromTimestamp, toTimestamp);

      const userActivity: Record<string, number> = {};
      for (const metric of metrics) {
        if ((metric as any).metadata) {
          try {
            const data = JSON.parse((metric as any).metadata);
            for (const [userId, count] of Object.entries(data)) {
              if (userId === 'time_bucket') continue;
              const previousCount = userActivity[userId] || 0;
              userActivity[userId] = previousCount + (count as number);
            }
          } catch (e) {}
        }
      }

      const topUsersData = Object.entries(userActivity)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      const topUsers = await Promise.all(
        topUsersData.map(async ([userId, count]) => {
          try {
            const user = await client.users.fetch(userId);
            return {
              userId,
              username: user.username,
              discriminator: user.discriminator,
              avatar: user.displayAvatarURL({ size: 64 }),
              messageCount: count
            };
          } catch (error) {
            return {
              userId,
              username: 'Unknown User',
              discriminator: '0000',
              avatar: null,
              messageCount: count
            };
          }
        })
      );

      res.json({ success: true, data: topUsers });
    } catch (error) {
      console.error('Failed to fetch top users:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch top users' });
    }
  });

  router.get('/guilds/:guildId/analytics/top-channels', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { from, to } = req.query;

      const fromTimestamp = from ? parseInt(from as string) : undefined;
      const toTimestamp = to ? parseInt(to as string) : undefined;

      const metrics = db.getAnalyticsMetrics(guildId, 'channel_activity', fromTimestamp, toTimestamp);

      const channelActivity: Record<string, number> = {};
      for (const metric of metrics) {
        if ((metric as any).metadata) {
          try {
            const data = JSON.parse((metric as any).metadata);
            for (const [channelId, count] of Object.entries(data)) {
              if (channelId === 'time_bucket') continue;
              channelActivity[channelId] = (channelActivity[channelId] || 0) + (count as number);
            }
          } catch (e) {}
        }
      }

      const guild = await client.guilds.fetch(guildId);
      const topChannelsData = Object.entries(channelActivity)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      const topChannels = topChannelsData.map(([channelId, count]) => {
        try {
          const channel = guild.channels.cache.get(channelId);
          return {
            channelId,
            channelName: channel?.name || 'Unknown Channel',
            messageCount: count
          };
        } catch (error) {
          return {
            channelId,
            channelName: 'Unknown Channel',
            messageCount: count
          };
        }
      });

      res.json({ success: true, data: topChannels });
    } catch (error) {
      console.error('Failed to fetch top channels:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch top channels' });
    }
  });

  return router;
}
