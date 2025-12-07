import { Router, Request, Response } from 'express';
import { isAuthenticated, hasGuildAccess } from '../middleware/auth-check.js';
import { DatabaseManager } from '../../database/Database.js';

export function createAppealsRoutes(client: any): Router {
  const router = Router();
  const db = DatabaseManager.getInstance();

  router.get('/guilds/:guildId/appeals', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { status, userId, type } = req.query;

      const filters: any = {};
      if (status) filters.status = status as string;
      if (userId) filters.userId = userId as string;
      if (type) filters.type = type as string;

      const appeals = db.getAppeals(guildId, filters);
      const guild = client.guilds.cache.get(guildId);

      const appealsWithUserData = await Promise.all(appeals.map(async (appeal: any) => {
        let userData = null;
        try {
          const user = await client.users.fetch(appeal.user_id);
          userData = {
            username: user.username,
            discriminator: user.discriminator,
            tag: user.tag,
            avatar: user.displayAvatarURL({ size: 64 })
          };
        } catch (error) {
          userData = {
            username: 'Unknown User',
            discriminator: '0000',
            tag: 'Unknown User#0000',
            avatar: 'https://cdn.discordapp.com/embed/avatars/0.png'
          };
        }

        return {
          ...appeal,
          user: userData
        };
      }));

      res.json({ success: true, data: appealsWithUserData });
    } catch (error) {
      console.error('Failed to fetch appeals:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch appeals' });
    }
  });

  router.post('/guilds/:guildId/appeals', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { userId, type, actionId, reason } = req.body;

      if (!userId || !type || !reason) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      db.createAppeal(guildId, userId, type, actionId || null, reason);

      res.json({ success: true, message: 'Appeal created successfully' });
    } catch (error) {
      console.error('Failed to create appeal:', error);
      res.status(500).json({ success: false, error: 'Failed to create appeal' });
    }
  });

  router.patch('/guilds/:guildId/appeals/:appealId', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { appealId } = req.params;
      const { status, moderatorReason } = req.body;
      const moderatorId = (req.user as any).id;

      if (!status || !['approved', 'denied'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }

      db.updateAppeal(parseInt(appealId), moderatorId, status, moderatorReason);

      res.json({ success: true, message: 'Appeal updated successfully' });
    } catch (error) {
      console.error('Failed to update appeal:', error);
      res.status(500).json({ success: false, error: 'Failed to update appeal' });
    }
  });

  router.delete('/guilds/:guildId/appeals/:appealId', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { appealId } = req.params;

      db.deleteAppeal(parseInt(appealId));

      res.json({ success: true, message: 'Appeal deleted successfully' });
    } catch (error) {
      console.error('Failed to delete appeal:', error);
      res.status(500).json({ success: false, error: 'Failed to delete appeal' });
    }
  });

  router.post('/guilds/:guildId/appeals/:appealId/notes', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { appealId } = req.params;
      const { note } = req.body;
      const moderatorId = (req.user as any).id;

      if (!note) {
        return res.status(400).json({ success: false, error: 'Note is required' });
      }

      db.addAppealNote(parseInt(appealId), moderatorId, note);

      res.json({ success: true, message: 'Note added successfully' });
    } catch (error) {
      console.error('Failed to add note:', error);
      res.status(500).json({ success: false, error: 'Failed to add note' });
    }
  });

  router.get('/guilds/:guildId/appeals/:appealId/notes', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { appealId } = req.params;

      const notes = db.getAppealNotes(parseInt(appealId));

      res.json({ success: true, data: notes });
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch notes' });
    }
  });

  return router;
}
