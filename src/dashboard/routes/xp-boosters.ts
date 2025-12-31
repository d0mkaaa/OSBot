import { Router, Request, Response } from 'express';
import { DatabaseManager } from '../../database/Database.js';
import { logger } from '../../utils/logger.js';
import { requireLevelingEnabled } from '../middleware/module-check.js';

const router = Router();
const db = DatabaseManager.getInstance();

router.use('/guilds/:guildId/xp', requireLevelingEnabled);

router.get('/guilds/:guildId/xp/boosters', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const boosters = db.getXPBoosters(guildId);

    res.json({
      success: true,
      data: boosters
    });
  } catch (error) {
    logger.error('Failed to fetch XP boosters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch XP boosters'
    });
  }
});

router.post('/guilds/:guildId/xp/boosters', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const { type, target_id, multiplier } = req.body;

    if (!type || !target_id || !multiplier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, target_id, multiplier'
      });
    }

    if (type !== 'role' && type !== 'channel') {
      return res.status(400).json({
        success: false,
        error: 'Type must be either "role" or "channel"'
      });
    }

    if (multiplier < 1.0 || multiplier > 5.0) {
      return res.status(400).json({
        success: false,
        error: 'Multiplier must be between 1.0 and 5.0'
      });
    }

    const existing = db.getXPBooster(guildId, type, target_id);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An XP booster already exists for this target'
      });
    }

    const userId = (req as any).user?.id || 'unknown';
    db.addXPBooster(guildId, type, target_id, multiplier, userId);

    res.json({
      success: true,
      message: 'XP booster added successfully'
    });
  } catch (error) {
    logger.error('Failed to add XP booster:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add XP booster'
    });
  }
});

router.patch('/guilds/:guildId/xp/boosters/:type/:targetId', async (req: Request, res: Response) => {
  try {
    const { guildId, type, targetId } = req.params;
    const { multiplier } = req.body;

    if (!multiplier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: multiplier'
      });
    }

    if (multiplier < 1.0 || multiplier > 5.0) {
      return res.status(400).json({
        success: false,
        error: 'Multiplier must be between 1.0 and 5.0'
      });
    }

    const existing = db.getXPBooster(guildId, type, targetId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'XP booster not found'
      });
    }

    db.updateXPBooster(guildId, type, targetId, multiplier);

    res.json({
      success: true,
      message: 'XP booster updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update XP booster:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update XP booster'
    });
  }
});

router.delete('/guilds/:guildId/xp/boosters/:type/:targetId', async (req: Request, res: Response) => {
  try {
    const { guildId, type, targetId } = req.params;

    db.deleteXPBooster(guildId, type, targetId);

    res.json({
      success: true,
      message: 'XP booster deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete XP booster:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete XP booster'
    });
  }
});

export default router;
