import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { logger } from './logger.js';
import { env } from '../config/environment.js';
import { Guild, ChannelType } from 'discord.js';
import { DatabaseManager } from '../database/Database.js';

export interface BackupResult {
  success: boolean;
  path?: string;
  error?: string;
  timestamp: number;
}

export class BackupManager {
  private static instance: BackupManager | null = null;
  private backupDir: string;
  private databasePath: string;
  private maxBackups: number;
  private autoBackupInterval: NodeJS.Timeout | null = null;
  private isBackingUp = false;

  private constructor() {
    this.backupDir = env.backupDir || './backups';
    this.databasePath = env.databasePath || './data/bot.db';
    this.maxBackups = env.backupRetention || 7;

    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }
  }

  public static getInstance(): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
    }
    return BackupManager.instance;
  }

  public async createBackup(manual = false): Promise<BackupResult> {
    if (this.isBackingUp) {
      return {
        success: false,
        error: 'Backup already in progress',
        timestamp: Date.now()
      };
    }

    this.isBackingUp = true;

    try {
      if (!existsSync(this.databasePath)) {
        throw new Error(`Database file not found at ${this.databasePath}`);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      const backupName = manual ? `manual_${timestamp}` : `auto_${timestamp}`;
      const backupPath = join(this.backupDir, `${backupName}.db`);

      copyFileSync(this.databasePath, backupPath);

      const walPath = `${this.databasePath}-wal`;
      const shmPath = `${this.databasePath}-shm`;

      if (existsSync(walPath)) {
        copyFileSync(walPath, `${backupPath}-wal`);
      }
      if (existsSync(shmPath)) {
        copyFileSync(shmPath, `${backupPath}-shm`);
      }

      const stats = statSync(backupPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      logger.success(`Backup created: ${backupName}.db (${sizeMB} MB)`);

      this.cleanOldBackups();

      return {
        success: true,
        path: backupPath,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Failed to create backup', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    } finally {
      this.isBackingUp = false;
    }
  }

  private cleanOldBackups(): void {
    try {
      if (!existsSync(this.backupDir)) return;

      const files = readdirSync(this.backupDir)
        .filter(f => f.endsWith('.db'))
        .map(f => ({
          name: f,
          path: join(this.backupDir, f),
          time: statSync(join(this.backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > this.maxBackups) {
        const toDelete = files.slice(this.maxBackups);
        for (const file of toDelete) {
          unlinkSync(file.path);

          const walFile = `${file.path}-wal`;
          const shmFile = `${file.path}-shm`;
          if (existsSync(walFile)) unlinkSync(walFile);
          if (existsSync(shmFile)) unlinkSync(shmFile);

          logger.info(`Deleted old backup: ${file.name}`);
        }
      }
    } catch (error) {
      logger.error('Failed to clean old backups', error);
    }
  }

  public listBackups(): Array<{ name: string; size: string; date: Date }> {
    try {
      if (!existsSync(this.backupDir)) return [];

      return readdirSync(this.backupDir)
        .filter(f => f.endsWith('.db'))
        .map(f => {
          const path = join(this.backupDir, f);
          const stats = statSync(path);
          return {
            name: f,
            size: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
            date: stats.mtime
          };
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
      logger.error('Failed to list backups', error);
      return [];
    }
  }

  public async restoreBackup(backupName: string): Promise<BackupResult> {
    try {
      const backupPath = join(this.backupDir, backupName);

      if (!existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupName}`);
      }

      const restoreTimestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      const currentBackupPath = join(this.backupDir, `pre_restore_${restoreTimestamp}.db`);

      if (existsSync(this.databasePath)) {
        copyFileSync(this.databasePath, currentBackupPath);
        logger.info(`Created safety backup before restore: pre_restore_${restoreTimestamp}.db`);
      }

      copyFileSync(backupPath, this.databasePath);

      const walBackup = `${backupPath}-wal`;
      const shmBackup = `${backupPath}-shm`;

      if (existsSync(walBackup)) {
        copyFileSync(walBackup, `${this.databasePath}-wal`);
      }
      if (existsSync(shmBackup)) {
        copyFileSync(shmBackup, `${this.databasePath}-shm`);
      }

      logger.success(`Database restored from backup: ${backupName}`);

      return {
        success: true,
        path: backupPath,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Failed to restore backup', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  public startAutoBackup(intervalHours: number = 24): void {
    if (this.autoBackupInterval) {
      this.stopAutoBackup();
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;

    logger.info(`Auto-backup enabled: every ${intervalHours} hours`);

    this.autoBackupInterval = setInterval(() => {
      this.createBackup(false);
    }, intervalMs);

    this.createBackup(false);
  }

  public stopAutoBackup(): void {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
      logger.info('Auto-backup disabled');
    }
  }

  public getStatus() {
    return {
      enabled: this.autoBackupInterval !== null,
      backupDir: this.backupDir,
      maxBackups: this.maxBackups,
      totalBackups: this.listBackups().length,
      isBackingUp: this.isBackingUp
    };
  }

  public async createGuildBackup(
    guild: Guild,
    userId: string,
    includes: string[] = ['settings', 'roles', 'channels', 'rules', 'automod']
  ): Promise<{ backupId: number; filePath: string; size: number }> {
    try {
      const db = DatabaseManager.getInstance();
      const backupData: any = {
        version: '1.0',
        guildId: guild.id,
        guildName: guild.name,
        createdAt: Math.floor(Date.now() / 1000),
        includes,
        data: {}
      };

      if (includes.includes('settings')) {
        backupData.data.settings = db.getGuild(guild.id);
      }

      if (includes.includes('roles')) {
        backupData.data.roles = await this.backupRoles(guild);
      }

      if (includes.includes('channels')) {
        backupData.data.channels = await this.backupChannels(guild);
      }

      if (includes.includes('rules')) {
        backupData.data.rules = db.getRules(guild.id);
      }

      if (includes.includes('automod')) {
        backupData.data.automod = db.getAutomodSettings(guild.id);
      }

      if (includes.includes('levelRoles')) {
        backupData.data.levelRoles = db.getLevelRoles(guild.id);
      }

      const timestamp = Date.now();
      const fileName = `guild_${guild.id}_${timestamp}.json`;
      const guildBackupDir = join(this.backupDir, 'guilds');

      if (!existsSync(guildBackupDir)) {
        mkdirSync(guildBackupDir, { recursive: true });
      }

      const filePath = join(guildBackupDir, fileName);
      const jsonData = JSON.stringify(backupData, null, 2);
      writeFileSync(filePath, jsonData);

      const sizeBytes = Buffer.byteLength(jsonData);
      const backupName = `Backup ${new Date(timestamp).toISOString()}`;

      db.createBackup(guild.id, backupName, userId, sizeBytes, filePath, includes);

      const backups = db.getBackups(guild.id);
      const backupId = (backups[0] as any)?.id || 0;

      logger.success(`Created guild backup for ${guild.name} (${guild.id})`);

      return { backupId, filePath, size: sizeBytes };
    } catch (error) {
      logger.error(`Failed to create guild backup for ${guild.id}`, error);
      throw error;
    }
  }

  private async backupRoles(guild: Guild): Promise<any[]> {
    const roles = await guild.roles.fetch();
    return roles
      .filter(role => role.id !== guild.id)
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        position: role.position,
        permissions: role.permissions.bitfield.toString(),
        mentionable: role.mentionable,
        icon: role.iconURL(),
        unicodeEmoji: role.unicodeEmoji
      }));
  }

  private async backupChannels(guild: Guild): Promise<any[]> {
    const channels = await guild.channels.fetch();
    return channels
      .filter(ch => ch !== null)
      .map(channel => {
        const baseData: any = {
          id: channel!.id,
          name: channel!.name,
          type: channel!.type,
          position: channel!.position
        };

        if (channel!.type === ChannelType.GuildText || channel!.type === ChannelType.GuildVoice || channel!.type === ChannelType.GuildCategory) {
          const guildChannel = channel as any;
          baseData.parent = guildChannel.parent?.id || null;

          if ('topic' in guildChannel) {
            baseData.topic = guildChannel.topic;
          }
          if ('nsfw' in guildChannel) {
            baseData.nsfw = guildChannel.nsfw;
          }
          if ('rateLimitPerUser' in guildChannel) {
            baseData.rateLimitPerUser = guildChannel.rateLimitPerUser;
          }
          if ('bitrate' in guildChannel) {
            baseData.bitrate = guildChannel.bitrate;
          }
          if ('userLimit' in guildChannel) {
            baseData.userLimit = guildChannel.userLimit;
          }

          baseData.permissions = guildChannel.permissionOverwrites?.cache.map((perm: any) => ({
            id: perm.id,
            type: perm.type,
            allow: perm.allow.bitfield.toString(),
            deny: perm.deny.bitfield.toString()
          })) || [];
        }

        return baseData;
      });
  }

  public async restoreGuildBackup(
    guild: Guild,
    backupId: number,
    options: {
      restoreSettings?: boolean;
      restoreRules?: boolean;
      restoreAutomod?: boolean;
      restoreLevelRoles?: boolean;
    } = {}
  ): Promise<{ success: boolean; restored: string[] }> {
    try {
      const db = DatabaseManager.getInstance();
      const backup = db.getBackup(backupId);

      if (!backup) {
        throw new Error('Backup not found');
      }

      const backupData = JSON.parse(readFileSync((backup as any).file_path, 'utf-8'));
      const restored: string[] = [];

      if (options.restoreSettings && backupData.data.settings) {
        const settings = backupData.data.settings;
        const allowedFields: any = {};
        const allowedKeys = ['prefix', 'locale', 'welcome_message', 'goodbye_message', 'level_up_message'];

        for (const key of allowedKeys) {
          if (key in settings) {
            allowedFields[key] = settings[key];
          }
        }

        if (Object.keys(allowedFields).length > 0) {
          db.updateGuild(guild.id, allowedFields);
          restored.push('settings');
        }
      }

      if (options.restoreRules && backupData.data.rules) {
        for (const rule of backupData.data.rules) {
          try {
            db.createRule(guild.id, rule.rule_number, rule.title, rule.description);
          } catch (error) {
            logger.warn(`Failed to restore rule ${rule.rule_number}: ${error}`);
          }
        }
        restored.push('rules');
      }

      if (options.restoreAutomod && backupData.data.automod) {
        db.updateAutomodSettings(guild.id, backupData.data.automod);
        restored.push('automod');
      }

      if (options.restoreLevelRoles && backupData.data.levelRoles) {
        for (const levelRole of backupData.data.levelRoles) {
          try {
            const role = guild.roles.cache.find(r => r.name === levelRole.role_id);
            if (role) {
              db.addLevelRole(guild.id, levelRole.level, role.id);
            }
          } catch (error) {
            logger.warn(`Failed to restore level role for level ${levelRole.level}: ${error}`);
          }
        }
        restored.push('levelRoles');
      }

      logger.success(`Restored backup ${backupId} for guild ${guild.name}`);
      return { success: true, restored };
    } catch (error) {
      logger.error(`Failed to restore backup ${backupId}`, error);
      throw error;
    }
  }

  public getGuildBackupData(backupId: number): any | null {
    try {
      const db = DatabaseManager.getInstance();
      const backup = db.getBackup(backupId);
      if (!backup) return null;

      return JSON.parse(readFileSync((backup as any).file_path, 'utf-8'));
    } catch (error) {
      logger.error(`Failed to read backup ${backupId}`, error);
      return null;
    }
  }

  public deleteGuildBackup(backupId: number): boolean {
    try {
      const db = DatabaseManager.getInstance();
      const backup = db.getBackup(backupId);
      if (!backup) return false;

      if (existsSync((backup as any).file_path)) {
        unlinkSync((backup as any).file_path);
      }

      db.deleteBackup(backupId);
      logger.success(`Deleted backup ${backupId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete backup ${backupId}`, error);
      return false;
    }
  }
}
