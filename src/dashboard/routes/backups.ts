import { Router, Request, Response } from 'express';
import { isAuthenticated, hasGuildAccess } from '../middleware/auth-check.js';
import { DatabaseManager } from '../../database/Database.js';
import { BackupManager } from '../../utils/backup-manager.js';
import { readFileSync } from 'fs';

export function createBackupsRoutes(client: any): Router {
  const router = Router();
  const db = DatabaseManager.getInstance();
  const backupManager = BackupManager.getInstance();

  router.post('/guilds/:guildId/backups/create', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { includes = ['settings', 'roles', 'channels', 'rules', 'automod'] } = req.body;
      const userId = (req.user as any).id;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Guild not found' });
      }

      const result = await backupManager.createGuildBackup(guild, userId, includes);

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Failed to create backup:', error);
      res.status(500).json({ success: false, error: 'Failed to create backup' });
    }
  });

  router.get('/guilds/:guildId/backups', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;

      const backups = db.getBackups(guildId);

      const formattedBackups = backups.map((backup: any) => ({
        id: backup.id,
        name: backup.backup_name,
        createdBy: backup.created_by,
        createdAt: backup.created_at,
        sizeBytes: backup.size_bytes,
        includes: JSON.parse(backup.includes)
      }));

      res.json({ success: true, data: formattedBackups });
    } catch (error) {
      console.error('Failed to fetch backups:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch backups' });
    }
  });

  router.get('/guilds/:guildId/backups/:backupId/download', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { backupId } = req.params;

      const backup = db.getBackup(parseInt(backupId));
      if (!backup) {
        return res.status(404).json({ success: false, error: 'Backup not found' });
      }

      const fileData = readFileSync((backup as any).file_path, 'utf-8');

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${(backup as any).backup_name}.json"`);
      res.send(fileData);
    } catch (error) {
      console.error('Failed to download backup:', error);
      res.status(500).json({ success: false, error: 'Failed to download backup' });
    }
  });

  router.post('/guilds/:guildId/backups/restore', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const { backupId, options = {} } = req.body;

      if (!backupId) {
        return res.status(400).json({ success: false, error: 'Backup ID is required' });
      }

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Guild not found' });
      }

      const result = await backupManager.restoreGuildBackup(guild, parseInt(backupId), options);

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Failed to restore backup:', error);
      res.status(500).json({ success: false, error: 'Failed to restore backup' });
    }
  });

  router.delete('/guilds/:guildId/backups/:backupId', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { backupId } = req.params;

      const success = backupManager.deleteGuildBackup(parseInt(backupId));

      if (!success) {
        return res.status(404).json({ success: false, error: 'Backup not found' });
      }

      res.json({ success: true, message: 'Backup deleted successfully' });
    } catch (error) {
      console.error('Failed to delete backup:', error);
      res.status(500).json({ success: false, error: 'Failed to delete backup' });
    }
  });

  router.get('/guilds/:guildId/backups/:backupId/preview', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { backupId } = req.params;

      const backupData = backupManager.getGuildBackupData(parseInt(backupId));

      if (!backupData) {
        return res.status(404).json({ success: false, error: 'Backup not found' });
      }

      res.json({ success: true, data: backupData });
    } catch (error) {
      console.error('Failed to preview backup:', error);
      res.status(500).json({ success: false, error: 'Failed to preview backup' });
    }
  });

  router.get('/system/backups', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const backups = backupManager.listBackups();

      const formatted = backups.map((backup: any) => ({
        name: backup.name,
        size: backup.size,
        date: backup.date,
        isAuto: backup.name.startsWith('auto_'),
        isManual: backup.name.startsWith('manual_'),
        isPreRestore: backup.name.startsWith('pre_restore_')
      }));

      res.json({ success: true, data: formatted });
    } catch (error) {
      console.error('Failed to list system backups:', error);
      res.status(500).json({ success: false, error: 'Failed to list system backups' });
    }
  });

  router.get('/system/backups/status', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const status = backupManager.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      console.error('Failed to get backup status:', error);
      res.status(500).json({ success: false, error: 'Failed to get backup status' });
    }
  });

  router.post('/system/backups/auto-backup/toggle', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { enabled, intervalHours = 24 } = req.body;

      if (enabled) {
        backupManager.startAutoBackup(intervalHours);
      } else {
        backupManager.stopAutoBackup();
      }

      const status = backupManager.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      console.error('Failed to toggle auto-backup:', error);
      res.status(500).json({ success: false, error: 'Failed to toggle auto-backup' });
    }
  });

  router.post('/system/backups/create', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const result = await backupManager.createBackup(true);

      if (result.success) {
        res.json({ success: true, data: result });
      } else {
        res.status(500).json({ success: false, error: result.error || 'Failed to create backup' });
      }
    } catch (error) {
      console.error('Failed to create system backup:', error);
      res.status(500).json({ success: false, error: 'Failed to create system backup' });
    }
  });

  router.post('/system/backups/restore', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { backupName } = req.body;

      if (!backupName) {
        return res.status(400).json({ success: false, error: 'Backup name is required' });
      }

      const result = await backupManager.restoreBackup(backupName);

      if (result.success) {
        res.json({ success: true, data: result });
      } else {
        res.status(500).json({ success: false, error: result.error || 'Failed to restore backup' });
      }
    } catch (error) {
      console.error('Failed to restore system backup:', error);
      res.status(500).json({ success: false, error: 'Failed to restore system backup' });
    }
  });

  return router;
}
