import express, { Request, Response } from 'express';
import { DatabaseManager } from '../../database/Database.js';
import { logger } from '../../utils/logger.js';
import { antiRaidManager } from '../../utils/antiraid.js';

const router = express.Router();
const db = DatabaseManager.getInstance();

router.get('/status/:guildId', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;

    const guildData = db.getGuild(guildId) as any;
    if (!guildData) {
      return res.status(404).json({ success: false, error: 'Guild not found' });
    }

    const lockdownStatus = antiRaidManager.getLockdownStatus(guildId);

    const status = {
      antiraid_enabled: guildData.antiraid_enabled === 1,
      antiraid_join_threshold: guildData.antiraid_join_threshold || 5,
      antiraid_join_window: guildData.antiraid_join_window || 10,
      antiraid_action: guildData.antiraid_action || 'kick',
      lockdown: {
        active: lockdownStatus.active,
        started_at: lockdownStatus.startedAt
      }
    };

    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('Failed to get antiraid status:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/lockdown/:guildId', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const { action } = req.body;

    if (!['enable', 'disable'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action. Must be "enable" or "disable"' });
    }

    const client = req.app.get('discordClient');
    const guild = client?.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ success: false, error: 'Guild not found' });
    }

    if (action === 'enable') {
      await antiRaidManager.activateLockdown(guild);
    } else {
      await antiRaidManager.deactivateLockdown(guild);
    }

    const lockdownStatus = antiRaidManager.getLockdownStatus(guildId);

    res.json({
      success: true,
      data: {
        lockdown: {
          active: lockdownStatus.active,
          started_at: lockdownStatus.startedAt
        }
      }
    });
  } catch (error) {
    logger.error('Failed to toggle lockdown:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.patch('/config/:guildId', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const { antiraid_enabled, antiraid_join_threshold, antiraid_join_window, antiraid_action } = req.body;

    const updates: any = {};

    if (antiraid_enabled !== undefined) {
      updates.antiraid_enabled = antiraid_enabled ? 1 : 0;
    }

    if (antiraid_join_threshold !== undefined) {
      if (antiraid_join_threshold < 2 || antiraid_join_threshold > 50) {
        return res.status(400).json({ success: false, error: 'Threshold must be between 2 and 50' });
      }
      updates.antiraid_join_threshold = antiraid_join_threshold;
    }

    if (antiraid_join_window !== undefined) {
      if (antiraid_join_window < 5 || antiraid_join_window > 60) {
        return res.status(400).json({ success: false, error: 'Window must be between 5 and 60 seconds' });
      }
      updates.antiraid_join_window = antiraid_join_window;
    }

    if (antiraid_action !== undefined) {
      if (!['kick', 'ban'].includes(antiraid_action)) {
        return res.status(400).json({ success: false, error: 'Action must be "kick" or "ban"' });
      }
      updates.antiraid_action = antiraid_action;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid updates provided' });
    }

    db.updateGuild(guildId, updates);

    res.json({ success: true, data: updates });
  } catch (error) {
    logger.error('Failed to update antiraid config:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
