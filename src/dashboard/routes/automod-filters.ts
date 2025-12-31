import { Router, Request, Response } from 'express';
import { DatabaseManager } from '../../database/Database.js';
import { logger } from '../../utils/logger.js';
import { requireAutomodEnabled } from '../middleware/module-check.js';

const router = Router();
const db = DatabaseManager.getInstance();

router.use('/guilds/:guildId/automod', requireAutomodEnabled);

router.get('/guilds/:guildId/automod/filters', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const filters = db.getCustomFilters(guildId);

    res.json({
      success: true,
      data: filters
    });
  } catch (error) {
    logger.error('Failed to fetch custom filters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch custom filters'
    });
  }
});

router.post('/guilds/:guildId/automod/filters', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const { name, pattern, action } = req.body;

    if (!name || !pattern || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, pattern, action'
      });
    }

    try {
      new RegExp(pattern);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid regex pattern'
      });
    }

    const existing = db.getCustomFilter(guildId, name);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'A filter with this name already exists'
      });
    }

    const userId = (req as any).user?.id || 'unknown';
    db.addCustomFilter(guildId, name, pattern, action, userId);

    res.json({
      success: true,
      message: 'Custom filter added successfully'
    });
  } catch (error) {
    logger.error('Failed to add custom filter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add custom filter'
    });
  }
});

router.patch('/guilds/:guildId/automod/filters/:name', async (req: Request, res: Response) => {
  try {
    const { guildId, name } = req.params;
    const { pattern, action, enabled } = req.body;

    const existing = db.getCustomFilter(guildId, name);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Filter not found'
      });
    }

    if (pattern) {
      try {
        new RegExp(pattern);
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid regex pattern'
        });
      }
    }

    const updates: any = {};
    if (pattern !== undefined) updates.pattern = pattern;
    if (action !== undefined) updates.action = action;
    if (enabled !== undefined) updates.enabled = enabled;

    db.updateCustomFilter(guildId, name, updates);

    res.json({
      success: true,
      message: 'Custom filter updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update custom filter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update custom filter'
    });
  }
});

router.delete('/guilds/:guildId/automod/filters/:name', async (req: Request, res: Response) => {
  try {
    const { guildId, name } = req.params;

    db.deleteCustomFilter(guildId, name);

    res.json({
      success: true,
      message: 'Custom filter deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete custom filter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete custom filter'
    });
  }
});

export default router;
