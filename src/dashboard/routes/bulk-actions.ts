import { Router, Request, Response } from 'express';
import { isAuthenticated, hasGuildAccess } from '../middleware/auth-check.js';
import { DatabaseManager } from '../../database/Database.js';

export function createBulkActionsRoutes(client: any): Router {
  const router = Router();
  const db = DatabaseManager.getInstance();

  router.post('/guilds/:guildId/bulk/ban', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { userIds, reason, deleteMessageDays = 0 } = req.body;
      const executorId = (req.user as any).id;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, error: 'User IDs array is required' });
      }

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Guild not found' });
      }

      let successCount = 0;
      let failedCount = 0;
      const failed: string[] = [];

      for (const userId of userIds) {
        try {
          await guild.members.ban(userId, {
            reason: reason || 'Bulk ban from dashboard',
            deleteMessageDays: deleteMessageDays
          });
          successCount++;
        } catch (error) {
          failedCount++;
          failed.push(userId);
        }
      }

      db.createBulkAction(
        guildId,
        executorId,
        'ban',
        userIds.length,
        successCount,
        failedCount,
        reason || null,
        JSON.stringify({ userIds, failed })
      );

      res.json({
        success: true,
        data: { successCount, failedCount, failed }
      });
    } catch (error) {
      console.error('Failed to bulk ban:', error);
      res.status(500).json({ success: false, error: 'Failed to bulk ban users' });
    }
  });

  router.post('/guilds/:guildId/bulk/kick', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { userIds, reason } = req.body;
      const executorId = (req.user as any).id;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, error: 'User IDs array is required' });
      }

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Guild not found' });
      }

      let successCount = 0;
      let failedCount = 0;
      const failed: string[] = [];

      for (const userId of userIds) {
        try {
          const member = await guild.members.fetch(userId);
          await member.kick(reason || 'Bulk kick from dashboard');
          successCount++;
        } catch (error) {
          failedCount++;
          failed.push(userId);
        }
      }

      db.createBulkAction(
        guildId,
        executorId,
        'kick',
        userIds.length,
        successCount,
        failedCount,
        reason || null,
        JSON.stringify({ userIds, failed })
      );

      res.json({
        success: true,
        data: { successCount, failedCount, failed }
      });
    } catch (error) {
      console.error('Failed to bulk kick:', error);
      res.status(500).json({ success: false, error: 'Failed to bulk kick users' });
    }
  });

  router.post('/guilds/:guildId/bulk/role-add', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { userIds, roleId, reason } = req.body;
      const executorId = (req.user as any).id;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, error: 'User IDs array is required' });
      }

      if (!roleId) {
        return res.status(400).json({ success: false, error: 'Role ID is required' });
      }

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Guild not found' });
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }

      let successCount = 0;
      let failedCount = 0;
      const failed: string[] = [];

      for (const userId of userIds) {
        try {
          const member = await guild.members.fetch(userId);
          await member.roles.add(role, reason || 'Bulk role add from dashboard');
          successCount++;
        } catch (error) {
          failedCount++;
          failed.push(userId);
        }
      }

      db.createBulkAction(
        guildId,
        executorId,
        'role_add',
        userIds.length,
        successCount,
        failedCount,
        reason || null,
        JSON.stringify({ userIds, roleId, failed })
      );

      res.json({
        success: true,
        data: { successCount, failedCount, failed }
      });
    } catch (error) {
      console.error('Failed to bulk add role:', error);
      res.status(500).json({ success: false, error: 'Failed to bulk add role' });
    }
  });

  router.post('/guilds/:guildId/bulk/role-remove', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { userIds, roleId, reason } = req.body;
      const executorId = (req.user as any).id;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, error: 'User IDs array is required' });
      }

      if (!roleId) {
        return res.status(400).json({ success: false, error: 'Role ID is required' });
      }

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Guild not found' });
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }

      let successCount = 0;
      let failedCount = 0;
      const failed: string[] = [];

      for (const userId of userIds) {
        try {
          const member = await guild.members.fetch(userId);
          await member.roles.remove(role, reason || 'Bulk role remove from dashboard');
          successCount++;
        } catch (error) {
          failedCount++;
          failed.push(userId);
        }
      }

      db.createBulkAction(
        guildId,
        executorId,
        'role_remove',
        userIds.length,
        successCount,
        failedCount,
        reason || null,
        JSON.stringify({ userIds, roleId, failed })
      );

      res.json({
        success: true,
        data: { successCount, failedCount, failed }
      });
    } catch (error) {
      console.error('Failed to bulk remove role:', error);
      res.status(500).json({ success: false, error: 'Failed to bulk remove role' });
    }
  });

  router.get('/guilds/:guildId/bulk/history', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const history = db.getBulkActions(guildId, limit);

      res.json({ success: true, data: history });
    } catch (error) {
      console.error('Failed to fetch bulk action history:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch bulk action history' });
    }
  });

  return router;
}
