import { Request, Response, NextFunction } from 'express';
import { DatabaseManager } from '../../database/Database.js';

const db = DatabaseManager.getInstance();

export const requireTicketsEnabled = (req: Request, res: Response, next: NextFunction) => {
  const { guildId } = req.params;
  const guildConfig = db.getGuild(guildId) as any;

  if (!guildConfig?.tickets_enabled) {
    return res.status(403).json({
      success: false,
      error: 'Ticket system is disabled on this server'
    });
  }

  next();
};

export const requireModerationEnabled = (req: Request, res: Response, next: NextFunction) => {
  const { guildId } = req.params;
  const guildConfig = db.getGuild(guildId) as any;

  if (!guildConfig?.moderation_enabled) {
    return res.status(403).json({
      success: false,
      error: 'Moderation system is disabled on this server'
    });
  }

  next();
};

export const requireLevelingEnabled = (req: Request, res: Response, next: NextFunction) => {
  const { guildId } = req.params;
  const guildConfig = db.getGuild(guildId) as any;

  if (!guildConfig?.leveling_enabled) {
    return res.status(403).json({
      success: false,
      error: 'Leveling system is disabled on this server'
    });
  }

  next();
};

export const requireAutomodEnabled = (req: Request, res: Response, next: NextFunction) => {
  const { guildId } = req.params;
  const guildConfig = db.getGuild(guildId) as any;

  if (!guildConfig?.automod_enabled) {
    return res.status(403).json({
      success: false,
      error: 'AutoMod system is disabled on this server'
    });
  }

  next();
};

export const requireMusicEnabled = (req: Request, res: Response, next: NextFunction) => {
  const { guildId } = req.params;
  const guildConfig = db.getGuild(guildId) as any;

  if (!guildConfig?.music_enabled) {
    return res.status(403).json({
      success: false,
      error: 'Music system is disabled on this server'
    });
  }

  next();
};
