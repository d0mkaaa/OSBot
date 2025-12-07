import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/environment.js';

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

export function isOwner(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const botOwners = env.botOwners.split(',').map(id => id.trim()).filter(id => id);

  if (botOwners.length === 0) {
    return next();
  }

  if (!botOwners.includes(user.id)) {
    return res.status(403).json({ error: 'Dashboard access restricted to bot owners only' });
  }

  next();
}

export function hasGuildAccess(req: Request, res: Response, next: NextFunction) {
  const guildId = req.params.guildId;
  const user = req.user as any;

  if (!user || !user.guilds) {
    return res.status(403).json({ error: 'No guild access' });
  }

  const hasAccess = user.guilds.some((guild: any) =>
    guild.id === guildId && (guild.permissions & 0x8) === 0x8
  );

  if (!hasAccess) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  next();
}
