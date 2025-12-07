import { Database } from 'bun:sqlite';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { env } from '../config/environment.js';
import type * as Types from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ALLOWED_GUILD_COLUMNS = new Set([
  'prefix', 'locale', 'ticket_category_id', 'ticket_support_role_id', 'ticket_log_channel_id',
  'welcome_channel_id', 'goodbye_channel_id', 'welcome_message', 'goodbye_message',
  'welcome_enabled', 'goodbye_enabled', 'welcome_embed', 'goodbye_embed', 'auto_role_id', 'mod_log_channel_id', 'audit_log_channel_id',
  'starboard_channel_id', 'starboard_threshold', 'xp_enabled', 'xp_min', 'xp_max', 'xp_cooldown',
  'level_up_channel_id', 'level_up_message', 'level_up_enabled', 'antiraid_enabled',
  'antiraid_join_threshold', 'antiraid_join_window', 'antiraid_action', 'warning_threshold_enabled',
  'warning_threshold_count', 'warning_threshold_action', 'warning_threshold_duration',
  'log_channel_id', 'log_message_edits', 'log_message_deletes', 'log_member_join',
  'log_member_leave', 'log_role_changes', 'log_voice_activity', 'log_channel_events',
  'log_server_events', 'log_role_events', 'log_ban_events', 'log_invite_events',
  'automod_spam_count', 'automod_spam_interval', 'automod_allowed_links',
  'automod_caps_percentage', 'automod_caps_min_length', 'automod_max_mentions',
  'automod_profanity_preset', 'automod_profanity_list', 'automod_allow_invites_list'
]);

const ALLOWED_MEMBER_COLUMNS = new Set(['level', 'xp', 'messages', 'warnings']);

const ALLOWED_AUTOMOD_COLUMNS = new Set([
  'spam_enabled', 'spam_threshold', 'spam_interval', 'links_enabled', 'links_whitelist',
  'caps_enabled', 'caps_threshold', 'mentions_enabled', 'mentions_threshold',
  'profanity_enabled', 'profanity_list', 'invites_enabled', 'invites_allow_own',
  'action', 'violations_threshold', 'violations_action', 'violations_duration'
]);

export class DatabaseManager {
  private db: Database;
  private static instance: DatabaseManager | null = null;
  private static isInitializing = false;

  private constructor(dbPath?: string) {
    const finalPath = dbPath || env.databasePath || './data/bot.db';
    const dataDir = dirname(finalPath);

    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(finalPath, { create: true });
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA foreign_keys = ON');
    this.db.exec('PRAGMA busy_timeout = 5000');

    this.initialize();
  }

  public static getInstance(dbPath?: string): DatabaseManager {
    if (DatabaseManager.instance) {
      return DatabaseManager.instance;
    }

    if (DatabaseManager.isInitializing) {
      throw new Error('Database is already being initialized');
    }

    DatabaseManager.isInitializing = true;
    try {
      DatabaseManager.instance = new DatabaseManager(dbPath);
      return DatabaseManager.instance;
    } finally {
      DatabaseManager.isInitializing = false;
    }
  }

  private initialize(): void {
    try {
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf-8');

      this.db.exec(schema);

      this.runMigrations();

      logger.success('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database', error);
      throw error;
    }
  }

  private runMigrations(): void {
    try {
      logger.info('Checking for pending migrations...');
      const tableInfo = this.db.prepare('PRAGMA table_info(warnings)').all() as any[];
      logger.info(`Warnings table has ${tableInfo.length} columns`);
      const hasRuleId = tableInfo.some(col => col.name === 'rule_id');

      if (!hasRuleId) {
        logger.info('Running migration: Adding rule_id column to warnings table');
        this.db.exec('ALTER TABLE warnings ADD COLUMN rule_id INTEGER REFERENCES rules(id) ON DELETE SET NULL');
        logger.success('Migration completed: rule_id column added');
      } else {
        logger.info('Migration skipped: rule_id column already exists');
      }
    } catch (error) {
      logger.warn(`Migration check failed, table might not exist yet: ${error}`);
    }

    try {
      const guildsTableInfo = this.db.prepare('PRAGMA table_info(guilds)').all() as any[];
      const existingColumns = new Set(guildsTableInfo.map((col: any) => col.name));

      const requiredColumns = [
        { name: 'locale', sql: 'ALTER TABLE guilds ADD COLUMN locale TEXT DEFAULT \'en\'' },
        { name: 'welcome_channel_id', sql: 'ALTER TABLE guilds ADD COLUMN welcome_channel_id TEXT' },
        { name: 'goodbye_channel_id', sql: 'ALTER TABLE guilds ADD COLUMN goodbye_channel_id TEXT' },
        { name: 'level_up_channel_id', sql: 'ALTER TABLE guilds ADD COLUMN level_up_channel_id TEXT' },
        { name: 'mod_log_channel_id', sql: 'ALTER TABLE guilds ADD COLUMN mod_log_channel_id TEXT' },
        { name: 'audit_log_channel_id', sql: 'ALTER TABLE guilds ADD COLUMN audit_log_channel_id TEXT' },
        { name: 'starboard_channel_id', sql: 'ALTER TABLE guilds ADD COLUMN starboard_channel_id TEXT' },
        { name: 'starboard_threshold', sql: 'ALTER TABLE guilds ADD COLUMN starboard_threshold INTEGER DEFAULT 3' },
        { name: 'ticket_category_id', sql: 'ALTER TABLE guilds ADD COLUMN ticket_category_id TEXT' },
        { name: 'ticket_support_role_id', sql: 'ALTER TABLE guilds ADD COLUMN ticket_support_role_id TEXT' },
        { name: 'ticket_log_channel_id', sql: 'ALTER TABLE guilds ADD COLUMN ticket_log_channel_id TEXT' },
        { name: 'ticket_dm_transcript', sql: 'ALTER TABLE guilds ADD COLUMN ticket_dm_transcript BOOLEAN DEFAULT 1' },
        { name: 'ticket_open_message', sql: 'ALTER TABLE guilds ADD COLUMN ticket_open_message TEXT DEFAULT \'Welcome {user}!\\n\\n**Subject:** {subject}\\n\\nA staff member will be with you shortly. Please describe your issue in detail.\'' },
        { name: 'ticket_close_message', sql: 'ALTER TABLE guilds ADD COLUMN ticket_close_message TEXT DEFAULT \'This ticket has been closed by {closer}.\'' },
        { name: 'ticket_dm_message', sql: 'ALTER TABLE guilds ADD COLUMN ticket_dm_message TEXT DEFAULT \'Your ticket in **{server}** has been closed.\\n\\n**Subject:** {subject}\\n**Closed by:** {closer}\\n\\nA transcript of your ticket has been attached for your records.\'' },
        { name: 'ticket_max_open', sql: 'ALTER TABLE guilds ADD COLUMN ticket_max_open INTEGER DEFAULT 1' },
        { name: 'ticket_naming_format', sql: 'ALTER TABLE guilds ADD COLUMN ticket_naming_format TEXT DEFAULT \'username\'' },
        { name: 'welcome_embed', sql: 'ALTER TABLE guilds ADD COLUMN welcome_embed TEXT' },
        { name: 'goodbye_embed', sql: 'ALTER TABLE guilds ADD COLUMN goodbye_embed TEXT' },
        { name: 'ticket_open_embed', sql: 'ALTER TABLE guilds ADD COLUMN ticket_open_embed TEXT' },
        { name: 'ticket_close_embed', sql: 'ALTER TABLE guilds ADD COLUMN ticket_close_embed TEXT' },
        { name: 'ticket_dm_embed', sql: 'ALTER TABLE guilds ADD COLUMN ticket_dm_embed TEXT' },
        { name: 'automod_spam_count', sql: 'ALTER TABLE guilds ADD COLUMN automod_spam_count INTEGER DEFAULT 5' },
        { name: 'automod_spam_interval', sql: 'ALTER TABLE guilds ADD COLUMN automod_spam_interval INTEGER DEFAULT 5' },
        { name: 'automod_allowed_links', sql: 'ALTER TABLE guilds ADD COLUMN automod_allowed_links TEXT' },
        { name: 'automod_caps_percentage', sql: 'ALTER TABLE guilds ADD COLUMN automod_caps_percentage INTEGER DEFAULT 70' },
        { name: 'automod_caps_min_length', sql: 'ALTER TABLE guilds ADD COLUMN automod_caps_min_length INTEGER DEFAULT 10' },
        { name: 'automod_max_mentions', sql: 'ALTER TABLE guilds ADD COLUMN automod_max_mentions INTEGER DEFAULT 5' },
        { name: 'automod_profanity_list', sql: 'ALTER TABLE guilds ADD COLUMN automod_profanity_list TEXT' },
        { name: 'automod_allow_invites_list', sql: 'ALTER TABLE guilds ADD COLUMN automod_allow_invites_list TEXT' },
        { name: 'automod_profanity_preset', sql: 'ALTER TABLE guilds ADD COLUMN automod_profanity_preset TEXT DEFAULT \'moderate\'' }
      ];

      for (const column of requiredColumns) {
        if (!existingColumns.has(column.name)) {
          logger.info(`Running migration: Adding ${column.name} column to guilds table`);
          this.db.run(column.sql);
          logger.success(`Migration completed: ${column.name} column added`);
        }
      }
    } catch (error) {
      logger.warn(`Guilds table migration check failed: ${error}`);
    }

    try {
      const ticketsTableInfo = this.db.prepare('PRAGMA table_info(tickets)').all() as any[];
      const existingColumns = new Set(ticketsTableInfo.map((col: any) => col.name));

      if (!existingColumns.has('transcript')) {
        logger.info('Running migration: Adding transcript column to tickets table');
        this.db.run('ALTER TABLE tickets ADD COLUMN transcript TEXT');
        logger.success('Migration completed: transcript column added');
      }
    } catch (error) {
      logger.warn(`Tickets table migration check failed: ${error}`);
    }
  }

  public getDb(): Database {
    return this.db;
  }

  public close(): void {
    this.db.close();
    logger.info('Database connection closed');
  }

  public getGuild(guildId: string) {
    const stmt = this.db.prepare('SELECT * FROM guilds WHERE guild_id = ?');
    return stmt.get(guildId);
  }

  public createGuild(guildId: string) {
    const stmt = this.db.prepare('INSERT OR IGNORE INTO guilds (guild_id) VALUES (?)');
    return stmt.run(guildId);
  }

  public updateGuild(guildId: string, data: Record<string, any>): boolean {
    try {
      const keys = Object.keys(data).filter(key => ALLOWED_GUILD_COLUMNS.has(key));

      if (keys.length === 0) {
        const attemptedKeys = Object.keys(data).join(', ');
        if (attemptedKeys) {
          logger.warn(`Invalid guild update columns attempted: ${attemptedKeys}`);
        }
        return false;
      }

      const values = keys.map(key => data[key]);
      const setClause = keys.map(key => `${key} = ?`).join(', ');
      const stmt = this.db.prepare(
        `UPDATE guilds SET ${setClause}, updated_at = strftime('%s', 'now') WHERE guild_id = ?`
      );

      stmt.run(...values, guildId);
      return true;
    } catch (error) {
      logger.error(`Failed to update guild ${guildId}`, error);
      return false;
    }
  }

  public getUser(userId: string) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE user_id = ?');
    return stmt.get(userId);
  }

  public createUser(userId: string, username: string) {
    const stmt = this.db.prepare('INSERT OR IGNORE INTO users (user_id, username) VALUES (?, ?)');
    return stmt.run(userId, username);
  }

  public getGuildMember(guildId: string, userId: string) {
    const stmt = this.db.prepare(
      'SELECT * FROM guild_members WHERE guild_id = ? AND user_id = ?'
    );
    return stmt.get(guildId, userId);
  }

  public createGuildMember(guildId: string, userId: string) {
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO guild_members (guild_id, user_id) VALUES (?, ?)'
    );
    return stmt.run(guildId, userId);
  }

  public updateGuildMember(guildId: string, userId: string, data: Record<string, any>): boolean {
    try {
      const keys = Object.keys(data).filter(key => ALLOWED_MEMBER_COLUMNS.has(key));

      if (keys.length === 0) {
        const attemptedKeys = Object.keys(data).join(', ');
        if (attemptedKeys) {
          logger.warn(`Invalid guild member update columns attempted: ${attemptedKeys}`);
        }
        return false;
      }

      const values = keys.map(key => data[key]);
      const setClause = keys.map(key => `${key} = ?`).join(', ');
      const stmt = this.db.prepare(
        `UPDATE guild_members SET ${setClause} WHERE guild_id = ? AND user_id = ?`
      );

      stmt.run(...values, guildId, userId);
      return true;
    } catch (error) {
      logger.error(`Failed to update guild member ${userId} in ${guildId}`, error);
      return false;
    }
  }

  public createRule(guildId: string, ruleNumber: number, title: string, description: string) {
    const stmt = this.db.prepare(
      'INSERT INTO rules (guild_id, rule_number, title, description) VALUES (?, ?, ?, ?)'
    );
    return stmt.run(guildId, ruleNumber, title, description);
  }

  public getRule(guildId: string, ruleNumber: number) {
    const stmt = this.db.prepare(
      'SELECT * FROM rules WHERE guild_id = ? AND rule_number = ?'
    );
    return stmt.get(guildId, ruleNumber);
  }

  public getRules(guildId: string) {
    const stmt = this.db.prepare(
      'SELECT * FROM rules WHERE guild_id = ? ORDER BY rule_number ASC'
    );
    return stmt.all(guildId);
  }

  public updateRule(guildId: string, ruleNumber: number, title: string, description: string) {
    const stmt = this.db.prepare(
      `UPDATE rules SET title = ?, description = ?, updated_at = strftime('%s', 'now') WHERE guild_id = ? AND rule_number = ?`
    );
    return stmt.run(title, description, guildId, ruleNumber);
  }

  public deleteRule(guildId: string, ruleNumber: number) {
    const stmt = this.db.prepare(
      'DELETE FROM rules WHERE guild_id = ? AND rule_number = ?'
    );
    return stmt.run(guildId, ruleNumber);
  }

  public addWarning(guildId: string, userId: string, moderatorId: string, reason: string, ruleId?: number) {
    const stmt = this.db.prepare(
      'INSERT INTO warnings (guild_id, user_id, moderator_id, reason, rule_id) VALUES (?, ?, ?, ?, ?)'
    );
    return stmt.run(guildId, userId, moderatorId, reason, ruleId || null);
  }

  public getWarnings(guildId: string, userId: string) {
    const stmt = this.db.prepare(
      `SELECT w.*, r.rule_number, r.title as rule_title
       FROM warnings w
       LEFT JOIN rules r ON w.rule_id = r.id
       WHERE w.guild_id = ? AND w.user_id = ?
       ORDER BY w.created_at DESC`
    );
    return stmt.all(guildId, userId);
  }

  public getAllWarnings(guildId: string) {
    const stmt = this.db.prepare(
      `SELECT w.*, r.rule_number, r.title as rule_title
       FROM warnings w
       LEFT JOIN rules r ON w.rule_id = r.id
       WHERE w.guild_id = ?
       ORDER BY w.created_at DESC`
    );
    return stmt.all(guildId);
  }

  public removeWarning(caseId: number) {
    const stmt = this.db.prepare('DELETE FROM warnings WHERE id = ?');
    return stmt.run(caseId);
  }

  public clearWarnings(guildId: string, userId: string) {
    const stmt = this.db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?');
    return stmt.run(guildId, userId);
  }

  public lockNickname(guildId: string, userId: string, nickname: string, lockedBy: string) {
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO locked_nicknames (guild_id, user_id, locked_nickname, locked_by) VALUES (?, ?, ?, ?)'
    );
    return stmt.run(guildId, userId, nickname, lockedBy);
  }

  public getLockedNickname(guildId: string, userId: string) {
    const stmt = this.db.prepare('SELECT * FROM locked_nicknames WHERE guild_id = ? AND user_id = ?');
    return stmt.get(guildId, userId);
  }

  public unlockNickname(guildId: string, userId: string) {
    const stmt = this.db.prepare('DELETE FROM locked_nicknames WHERE guild_id = ? AND user_id = ?');
    return stmt.run(guildId, userId);
  }

  public getAllLockedNicknames(guildId: string) {
    const stmt = this.db.prepare('SELECT * FROM locked_nicknames WHERE guild_id = ?');
    return stmt.all(guildId);
  }

  // Tempban
  public addTempban(guildId: string, userId: string, moderatorId: string, expiresAt: number, reason?: string) {
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO tempbans (guild_id, user_id, moderator_id, expires_at, reason) VALUES (?, ?, ?, ?, ?)'
    );
    return stmt.run(guildId, userId, moderatorId, expiresAt, reason || null);
  }

  public getTempban(guildId: string, userId: string) {
    const stmt = this.db.prepare('SELECT * FROM tempbans WHERE guild_id = ? AND user_id = ? AND unbanned = 0');
    return stmt.get(guildId, userId);
  }

  public getExpiredTempbans() {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare('SELECT * FROM tempbans WHERE expires_at <= ? AND unbanned = 0');
    return stmt.all(now);
  }

  public markTempbanAsUnbanned(guildId: string, userId: string) {
    const stmt = this.db.prepare('UPDATE tempbans SET unbanned = 1 WHERE guild_id = ? AND user_id = ?');
    return stmt.run(guildId, userId);
  }

  public removeTempban(guildId: string, userId: string) {
    const stmt = this.db.prepare('DELETE FROM tempbans WHERE guild_id = ? AND user_id = ?');
    return stmt.run(guildId, userId);
  }

  public createCase(guildId: string, actionType: string, userId: string, moderatorId: string, reason?: string, duration?: number) {
    const caseNumStmt = this.db.prepare('SELECT MAX(case_number) as max FROM cases WHERE guild_id = ?');
    const result = caseNumStmt.get(guildId) as { max: number | null };
    const caseNumber = (result?.max || 0) + 1;

    const stmt = this.db.prepare(
      'INSERT INTO cases (guild_id, case_number, action_type, user_id, moderator_id, reason, duration) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run(guildId, caseNumber, actionType, userId, moderatorId, reason || null, duration || null);
    return caseNumber;
  }

  public getCase(guildId: string, caseNumber: number) {
    const stmt = this.db.prepare('SELECT * FROM cases WHERE guild_id = ? AND case_number = ?');
    return stmt.get(guildId, caseNumber);
  }

  public getCasesByUser(guildId: string, userId: string) {
    const stmt = this.db.prepare('SELECT * FROM cases WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC');
    return stmt.all(guildId, userId);
  }

  public getAllCases(guildId: string, limit = 50) {
    const stmt = this.db.prepare('SELECT * FROM cases WHERE guild_id = ? ORDER BY case_number DESC LIMIT ?');
    return stmt.all(guildId, limit);
  }

  // Invite tracking
  public saveInvite(guildId: string, inviteCode: string, inviterId: string | null, uses: number, maxUses: number | null) {
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO invites (guild_id, invite_code, inviter_id, uses, max_uses) VALUES (?, ?, ?, ?, ?)'
    );
    return stmt.run(guildId, inviteCode, inviterId, uses, maxUses);
  }

  public getInvites(guildId: string) {
    const stmt = this.db.prepare('SELECT * FROM invites WHERE guild_id = ?');
    return stmt.all(guildId);
  }

  public removeInvite(guildId: string, inviteCode: string) {
    const stmt = this.db.prepare('DELETE FROM invites WHERE guild_id = ? AND invite_code = ?');
    return stmt.run(guildId, inviteCode);
  }

  public saveMemberInvite(guildId: string, userId: string, inviterId: string | null, inviteCode: string | null) {
    const stmt = this.db.prepare(
      'INSERT INTO member_invites (guild_id, user_id, inviter_id, invite_code) VALUES (?, ?, ?, ?)'
    );
    return stmt.run(guildId, userId, inviterId, inviteCode);
  }

  public getMemberInvite(guildId: string, userId: string) {
    const stmt = this.db.prepare('SELECT * FROM member_invites WHERE guild_id = ? AND user_id = ?');
    return stmt.get(guildId, userId);
  }

  public getInvitesByInviter(guildId: string, inviterId: string) {
    const stmt = this.db.prepare('SELECT * FROM member_invites WHERE guild_id = ? AND inviter_id = ?');
    return stmt.all(guildId, inviterId);
  }

  public getSetting(guildId: string, key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE guild_id = ? AND key = ?');
    const result = stmt.get(guildId, key) as { value: string } | undefined;
    return result?.value || null;
  }

  public setSetting(guildId: string, key: string, value: string) {
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO settings (guild_id, key, value) VALUES (?, ?, ?)'
    );
    return stmt.run(guildId, key, value);
  }

  public addXP(guildId: string, userId: string, amount: number): { leveled: boolean; newLevel: number } {
    const member = this.getGuildMember(guildId, userId) as any;
    if (!member) return { leveled: false, newLevel: 0 };

    const currentLevel = member.level || 0;

    const stmt = this.db.prepare(`
      UPDATE guild_members
      SET xp = xp + ?, messages = messages + 1
      WHERE guild_id = ? AND user_id = ?
    `);
    stmt.run(amount, guildId, userId);

    const updatedMember = this.getGuildMember(guildId, userId) as any;
    const newLevel = this.calculateLevel(updatedMember.xp);
    const leveled = newLevel > currentLevel;

    if (leveled) {
      this.updateGuildMember(guildId, userId, { level: newLevel });
    }

    return { leveled, newLevel };
  }

  public calculateLevel(xp: number): number {
    return Math.floor(0.1 * Math.sqrt(xp));
  }

  public getXPForLevel(level: number): number {
    return Math.pow(level / 0.1, 2);
  }

  public getLeaderboard(guildId: string, limit: number = 10) {
    const stmt = this.db.prepare(
      `SELECT gm.*, u.username FROM guild_members gm
       LEFT JOIN users u ON gm.user_id = u.user_id
       WHERE gm.guild_id = ?
       ORDER BY gm.xp DESC, gm.level DESC
       LIMIT ?`
    );
    return stmt.all(guildId, limit);
  }

  public getUserRank(guildId: string, userId: string): number {
    const stmt = this.db.prepare(
      `SELECT COUNT(*) as rank
       FROM guild_members
       WHERE guild_id = ? AND (xp > (SELECT xp FROM guild_members WHERE guild_id = ? AND user_id = ?)
       OR (xp = (SELECT xp FROM guild_members WHERE guild_id = ? AND user_id = ?) AND user_id < ?))`
    );
    const result = stmt.get(guildId, guildId, userId, guildId, userId, userId) as { rank: number };
    return (result?.rank || 0) + 1;
  }

  public checkXPCooldown(guildId: string, userId: string, cooldownSeconds: number): boolean {
    const stmt = this.db.prepare(
      'SELECT last_xp_gain FROM xp_cooldowns WHERE guild_id = ? AND user_id = ?'
    );
    const result = stmt.get(guildId, userId) as { last_xp_gain: number } | undefined;

    if (!result) return false;

    const now = Math.floor(Date.now() / 1000);
    return (now - result.last_xp_gain) < cooldownSeconds;
  }

  public updateXPCooldown(guildId: string, userId: string) {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO xp_cooldowns (guild_id, user_id, last_xp_gain) VALUES (?, ?, ?)'
    );
    return stmt.run(guildId, userId, now);
  }

  public addLevelRole(guildId: string, level: number, roleId: string) {
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO level_roles (guild_id, level, role_id) VALUES (?, ?, ?)'
    );
    return stmt.run(guildId, level, roleId);
  }

  public getLevelRole(guildId: string, level: number) {
    const stmt = this.db.prepare(
      'SELECT * FROM level_roles WHERE guild_id = ? AND level = ?'
    );
    return stmt.get(guildId, level);
  }

  public getLevelRoles(guildId: string) {
    const stmt = this.db.prepare(
      'SELECT * FROM level_roles WHERE guild_id = ? ORDER BY level ASC'
    );
    return stmt.all(guildId);
  }

  public deleteLevelRole(guildId: string, level: number) {
    const stmt = this.db.prepare(
      'DELETE FROM level_roles WHERE guild_id = ? AND level = ?'
    );
    return stmt.run(guildId, level);
  }

  public createReminder(userId: string, guildId: string | null, channelId: string, message: string, remindAt: number) {
    const stmt = this.db.prepare(
      'INSERT INTO reminders (user_id, guild_id, channel_id, message, remind_at) VALUES (?, ?, ?, ?, ?)'
    );
    return stmt.run(userId, guildId, channelId, message, remindAt);
  }

  public getPendingReminders() {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(
      'SELECT * FROM reminders WHERE completed = 0 AND remind_at <= ? ORDER BY remind_at ASC'
    );
    return stmt.all(now);
  }

  public completeReminder(reminderId: number) {
    const stmt = this.db.prepare(
      'UPDATE reminders SET completed = 1 WHERE id = ?'
    );
    return stmt.run(reminderId);
  }

  public createGiveaway(guildId: string, channelId: string, prize: string, winnerCount: number, endsAt: number, createdBy: string): number {
    const stmt = this.db.prepare(
      'INSERT INTO giveaways (guild_id, channel_id, prize, winner_count, ends_at, created_by) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(guildId, channelId, prize, winnerCount, endsAt, createdBy);
    const result = this.db.query('SELECT last_insert_rowid() as id').get() as { id: number };
    return result.id;
  }

  public updateGiveawayMessage(giveawayId: number, messageId: string) {
    const stmt = this.db.prepare(
      'UPDATE giveaways SET message_id = ? WHERE id = ?'
    );
    return stmt.run(messageId, giveawayId);
  }

  public getPendingGiveaways() {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(
      'SELECT * FROM giveaways WHERE completed = 0 AND ends_at <= ? ORDER BY ends_at ASC'
    );
    return stmt.all(now);
  }

  public completeGiveaway(giveawayId: number) {
    const stmt = this.db.prepare(
      'UPDATE giveaways SET completed = 1 WHERE id = ?'
    );
    return stmt.run(giveawayId);
  }

  public getActiveGiveaways() {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(
      'SELECT * FROM giveaways WHERE completed = 0 AND ends_at > ? ORDER BY ends_at ASC'
    );
    return stmt.all(now);
  }

  public getGuildGiveaways(guildId: string) {
    const stmt = this.db.prepare(
      'SELECT * FROM giveaways WHERE guild_id = ? ORDER BY created_at DESC LIMIT 10'
    );
    return stmt.all(guildId);
  }

  public getGiveawayById(giveawayId: number) {
    const stmt = this.db.prepare('SELECT * FROM giveaways WHERE id = ?');
    return stmt.get(giveawayId);
  }

  public deleteGiveaway(giveawayId: number) {
    const stmt = this.db.prepare('DELETE FROM giveaways WHERE id = ?');
    return stmt.run(giveawayId);
  }

  public createPoll(guildId: string, channelId: string, question: string, options: string[], endsAt: number | null, createdBy: string): number {
    const stmt = this.db.prepare(
      'INSERT INTO polls (guild_id, channel_id, question, options, ends_at, created_by) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(guildId, channelId, question, JSON.stringify(options), endsAt, createdBy);
    const result = this.db.query('SELECT last_insert_rowid() as id').get() as { id: number };
    return result.id;
  }

  public updatePollMessage(pollId: number, messageId: string) {
    const stmt = this.db.prepare(
      'UPDATE polls SET message_id = ? WHERE id = ?'
    );
    return stmt.run(messageId, pollId);
  }

  public getPendingPolls() {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(
      'SELECT * FROM polls WHERE completed = 0 AND ends_at IS NOT NULL AND ends_at <= ? ORDER BY ends_at ASC'
    );
    return stmt.all(now);
  }

  public completePoll(pollId: number) {
    const stmt = this.db.prepare(
      'UPDATE polls SET completed = 1 WHERE id = ?'
    );
    return stmt.run(pollId);
  }

  public getActivePolls() {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(
      'SELECT * FROM polls WHERE completed = 0 AND (ends_at IS NULL OR ends_at > ?) ORDER BY created_at DESC'
    );
    return stmt.all(now);
  }

  public getGuildPolls(guildId: string) {
    const stmt = this.db.prepare(
      'SELECT * FROM polls WHERE guild_id = ? ORDER BY created_at DESC LIMIT 10'
    );
    return stmt.all(guildId);
  }

  public getPollById(pollId: number) {
    const stmt = this.db.prepare('SELECT * FROM polls WHERE id = ?');
    return stmt.get(pollId);
  }

  public getPollByMessageId(messageId: string) {
    const stmt = this.db.prepare('SELECT * FROM polls WHERE message_id = ?');
    return stmt.get(messageId);
  }

  public deletePoll(pollId: number) {
    const stmt = this.db.prepare('DELETE FROM polls WHERE id = ?');
    return stmt.run(pollId);
  }

  public getAutomodSettings(guildId: string) {
    const stmt = this.db.prepare('SELECT * FROM automod_settings WHERE guild_id = ?');
    return stmt.get(guildId);
  }

  public updateAutomodSettings(guildId: string, settings: Record<string, any>): boolean {
    try {
      const validKeys = Object.keys(settings).filter(key => ALLOWED_AUTOMOD_COLUMNS.has(key));

      if (validKeys.length === 0) {
        const attemptedKeys = Object.keys(settings).join(', ');
        if (attemptedKeys) {
          logger.warn(`Invalid automod settings columns attempted: ${attemptedKeys}`);
        }
        return false;
      }

      const existing = this.getAutomodSettings(guildId);

      if (!existing) {
        const keys = ['guild_id', ...validKeys];
        const values = [guildId, ...validKeys.map(key => settings[key])];
        const placeholders = keys.map(() => '?').join(', ');
        const stmt = this.db.prepare(
          `INSERT INTO automod_settings (${keys.join(', ')}) VALUES (${placeholders})`
        );
        stmt.run(...values);
      } else {
        const values = validKeys.map(key => settings[key]);
        const setClause = validKeys.map(key => `${key} = ?`).join(', ');
        const stmt = this.db.prepare(
          `UPDATE automod_settings SET ${setClause} WHERE guild_id = ?`
        );
        stmt.run(...values, guildId);
      }

      return true;
    } catch (error) {
      logger.error(`Failed to update automod settings for guild ${guildId}`, error);
      return false;
    }
  }

  public logAutomodViolation(guildId: string, userId: string, violationType: string, messageContent: string, actionTaken: string) {
    const stmt = this.db.prepare(
      'INSERT INTO automod_violations (guild_id, user_id, violation_type, message_content, action_taken) VALUES (?, ?, ?, ?, ?)'
    );
    return stmt.run(guildId, userId, violationType, messageContent, actionTaken);
  }

  public getRecentAutomodViolations(guildId: string, userId: string, timeWindowSeconds: number = 3600): number {
    const since = Math.floor(Date.now() / 1000) - timeWindowSeconds;
    const stmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM automod_violations WHERE guild_id = ? AND user_id = ? AND timestamp >= ?'
    );
    const result = stmt.get(guildId, userId, since) as { count: number };
    return result?.count || 0;
  }

  public createTicket(guildId: string, channelId: string, userId: string, subject?: string) {
    const stmt = this.db.prepare(
      'INSERT INTO tickets (guild_id, channel_id, user_id, subject) VALUES (?, ?, ?, ?)'
    );
    return stmt.run(guildId, channelId, userId, subject || null);
  }

  public getTicket(channelId: string) {
    const stmt = this.db.prepare('SELECT * FROM tickets WHERE channel_id = ? AND status = "open"');
    return stmt.get(channelId);
  }

  public closeTicket(channelId: string, closedBy: string, transcript?: string) {
    const stmt = this.db.prepare(
      'UPDATE tickets SET status = "closed", closed_at = strftime(\'%s\', \'now\'), closed_by = ?, transcript = ? WHERE channel_id = ?'
    );
    return stmt.run(closedBy, transcript || null, channelId);
  }

  public getUserTickets(guildId: string, userId: string) {
    const stmt = this.db.prepare(
      'SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC'
    );
    return stmt.all(guildId, userId);
  }

  public getAllTickets(guildId: string) {
    const stmt = this.db.prepare(
      'SELECT * FROM tickets WHERE guild_id = ? ORDER BY created_at DESC'
    );
    return stmt.all(guildId);
  }

  public getTicketById(ticketId: number) {
    const stmt = this.db.prepare('SELECT * FROM tickets WHERE id = ?');
    return stmt.get(ticketId);
  }

  public createReactionRole(guildId: string, messageId: string, channelId: string, emoji: string, roleId: string) {
    const stmt = this.db.prepare(
      'INSERT INTO reaction_roles (guild_id, message_id, channel_id, emoji, role_id) VALUES (?, ?, ?, ?, ?)'
    );
    return stmt.run(guildId, messageId, channelId, emoji, roleId);
  }

  public getReactionRole(messageId: string, emoji: string) {
    const stmt = this.db.prepare(
      'SELECT * FROM reaction_roles WHERE message_id = ? AND emoji = ?'
    );
    return stmt.get(messageId, emoji);
  }

  public getReactionRolesByMessage(messageId: string) {
    const stmt = this.db.prepare('SELECT * FROM reaction_roles WHERE message_id = ?');
    return stmt.all(messageId);
  }

  public deleteReactionRole(messageId: string, emoji: string) {
    const stmt = this.db.prepare(
      'DELETE FROM reaction_roles WHERE message_id = ? AND emoji = ?'
    );
    return stmt.run(messageId, emoji);
  }

  // Audit Logs
  public logAction(guildId: string, actionType: string, moderatorId: string, targetId: string | null, reason: string | null, details: string | null) {
    const stmt = this.db.prepare(
      'INSERT INTO audit_logs (guild_id, action_type, moderator_id, target_id, reason, details) VALUES (?, ?, ?, ?, ?, ?)'
    );
    return stmt.run(guildId, actionType, moderatorId, targetId, reason, details);
  }

  public getAuditLogs(guildId: string, limit: number = 50) {
    const stmt = this.db.prepare(
      'SELECT * FROM audit_logs WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ?'
    );
    return stmt.all(guildId, limit);
  }

  public getAuditLogsByModerator(guildId: string, moderatorId: string, limit: number = 50) {
    const stmt = this.db.prepare(
      'SELECT * FROM audit_logs WHERE guild_id = ? AND moderator_id = ? ORDER BY timestamp DESC LIMIT ?'
    );
    return stmt.all(guildId, moderatorId, limit);
  }

  public getAuditLogsByTarget(guildId: string, targetId: string, limit: number = 50) {
    const stmt = this.db.prepare(
      'SELECT * FROM audit_logs WHERE guild_id = ? AND target_id = ? ORDER BY timestamp DESC LIMIT ?'
    );
    return stmt.all(guildId, targetId, limit);
  }

  // Starboard
  public createStarboardEntry(guildId: string, messageId: string, channelId: string, authorId: string) {
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO starboard (guild_id, message_id, channel_id, author_id) VALUES (?, ?, ?, ?)'
    );
    return stmt.run(guildId, messageId, channelId, authorId);
  }

  public getStarboardEntry(guildId: string, messageId: string) {
    const stmt = this.db.prepare(
      'SELECT * FROM starboard WHERE guild_id = ? AND message_id = ?'
    );
    return stmt.get(guildId, messageId);
  }

  public updateStarboardCount(guildId: string, messageId: string, count: number) {
    const stmt = this.db.prepare(
      'UPDATE starboard SET star_count = ? WHERE guild_id = ? AND message_id = ?'
    );
    return stmt.run(count, guildId, messageId);
  }

  public updateStarboardMessageId(guildId: string, messageId: string, starboardMessageId: string) {
    const stmt = this.db.prepare(
      'UPDATE starboard SET starboard_message_id = ? WHERE guild_id = ? AND message_id = ?'
    );
    return stmt.run(starboardMessageId, guildId, messageId);
  }

  public deleteStarboardEntry(guildId: string, messageId: string) {
    const stmt = this.db.prepare(
      'DELETE FROM starboard WHERE guild_id = ? AND message_id = ?'
    );
    return stmt.run(guildId, messageId);
  }

  // Custom Commands
  public createCustomCommand(guildId: string, commandName: string, response: string, createdBy: string) {
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO custom_commands (guild_id, name, response, created_by) VALUES (?, ?, ?, ?)'
    );
    return stmt.run(guildId, commandName, response, createdBy);
  }

  public getCustomCommand(guildId: string, commandName: string) {
    const stmt = this.db.prepare(
      'SELECT * FROM custom_commands WHERE guild_id = ? AND name = ?'
    );
    return stmt.get(guildId, commandName);
  }

  public getAllCustomCommands(guildId: string) {
    const stmt = this.db.prepare(
      'SELECT * FROM custom_commands WHERE guild_id = ? ORDER BY name'
    );
    return stmt.all(guildId);
  }

  public deleteCustomCommand(guildId: string, commandName: string) {
    const stmt = this.db.prepare(
      'DELETE FROM custom_commands WHERE guild_id = ? AND name = ?'
    );
    return stmt.run(guildId, commandName);
  }

  public incrementCustomCommandUses(guildId: string, commandName: string) {
    const stmt = this.db.prepare(
      'UPDATE custom_commands SET uses = uses + 1 WHERE guild_id = ? AND name = ?'
    );
    return stmt.run(guildId, commandName);
  }

  public saveConsoleLog(id: string, timestamp: number, level: string, message: string, data?: any) {
    const stmt = this.db.prepare(
      'INSERT INTO console_logs (id, timestamp, level, message, data) VALUES (?, ?, ?, ?, ?)'
    );
    return stmt.run(id, timestamp, level, message, data ? JSON.stringify(data) : null);
  }

  public getConsoleLogs(limit: number = 100, offset: number = 0) {
    const stmt = this.db.prepare(
      'SELECT * FROM console_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?'
    );
    return stmt.all(limit, offset);
  }

  public deleteOldConsoleLogs(olderThan: number) {
    const stmt = this.db.prepare('DELETE FROM console_logs WHERE timestamp < ?');
    return stmt.run(olderThan);
  }

  public clearConsoleLogs() {
    const stmt = this.db.prepare('DELETE FROM console_logs');
    return stmt.run();
  }

  public createAppeal(guildId: string, userId: string, type: string, actionId: string | null, reason: string) {
    const stmt = this.db.prepare(
      'INSERT INTO appeals (guild_id, user_id, type, action_id, reason) VALUES (?, ?, ?, ?, ?)'
    );
    return stmt.run(guildId, userId, type, actionId, reason);
  }

  public getAppeal(appealId: number) {
    const stmt = this.db.prepare('SELECT * FROM appeals WHERE id = ?');
    return stmt.get(appealId);
  }

  public getAppeals(guildId: string, filters?: { status?: string; userId?: string; type?: string }) {
    let query = 'SELECT * FROM appeals WHERE guild_id = ?';
    const params: any[] = [guildId];

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }
    if (filters?.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    query += ' ORDER BY created_at DESC';
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  public updateAppeal(appealId: number, moderatorId: string, status: string, moderatorReason?: string) {
    const stmt = this.db.prepare(
      'UPDATE appeals SET status = ?, moderator_id = ?, moderator_reason = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?'
    );
    return stmt.run(status, moderatorId, moderatorReason || null, appealId);
  }

  public deleteAppeal(appealId: number) {
    const stmt = this.db.prepare('DELETE FROM appeals WHERE id = ?');
    return stmt.run(appealId);
  }

  public addAppealNote(appealId: number, moderatorId: string, note: string) {
    const stmt = this.db.prepare(
      'INSERT INTO appeal_notes (appeal_id, moderator_id, note) VALUES (?, ?, ?)'
    );
    return stmt.run(appealId, moderatorId, note);
  }

  public getAppealNotes(appealId: number) {
    const stmt = this.db.prepare(
      'SELECT * FROM appeal_notes WHERE appeal_id = ? ORDER BY created_at ASC'
    );
    return stmt.all(appealId);
  }

  public saveAnalyticsMetric(guildId: string, metricType: string, timeBucket: number, value: number, metadata?: string) {
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO analytics_cache (guild_id, metric_type, time_bucket, value, metadata) VALUES (?, ?, ?, ?, ?)'
    );
    return stmt.run(guildId, metricType, timeBucket, value, metadata || null);
  }

  public getAnalyticsMetrics(guildId: string, metricType: string, fromTimestamp?: number, toTimestamp?: number) {
    let query = 'SELECT * FROM analytics_cache WHERE guild_id = ? AND metric_type = ?';
    const params: any[] = [guildId, metricType];

    if (fromTimestamp) {
      query += ' AND time_bucket >= ?';
      params.push(fromTimestamp);
    }
    if (toTimestamp) {
      query += ' AND time_bucket <= ?';
      params.push(toTimestamp);
    }

    query += ' ORDER BY time_bucket ASC';
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  public incrementAnalyticsMetric(guildId: string, metricType: string, timeBucket: number, increment: number = 1) {
    const existing = this.db.prepare(
      'SELECT value FROM analytics_cache WHERE guild_id = ? AND metric_type = ? AND time_bucket = ?'
    ).get(guildId, metricType, timeBucket) as { value: number } | undefined;

    const newValue = (existing?.value || 0) + increment;
    return this.saveAnalyticsMetric(guildId, metricType, timeBucket, newValue);
  }

  public createBulkAction(guildId: string, executorId: string, actionType: string, targetCount: number, successCount: number, failedCount: number, reason: string | null, metadata: string) {
    const stmt = this.db.prepare(
      'INSERT INTO bulk_actions (guild_id, executor_id, action_type, target_count, success_count, failed_count, reason, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    return stmt.run(guildId, executorId, actionType, targetCount, successCount, failedCount, reason, metadata);
  }

  public getBulkActions(guildId: string, limit: number = 50) {
    const stmt = this.db.prepare(
      'SELECT * FROM bulk_actions WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?'
    );
    return stmt.all(guildId, limit);
  }

  public getBulkActionsByExecutor(guildId: string, executorId: string, limit: number = 50) {
    const stmt = this.db.prepare(
      'SELECT * FROM bulk_actions WHERE guild_id = ? AND executor_id = ? ORDER BY created_at DESC LIMIT ?'
    );
    return stmt.all(guildId, executorId, limit);
  }

  public createBackup(guildId: string, backupName: string, createdBy: string, sizeBytes: number, filePath: string, includes: string[]) {
    const stmt = this.db.prepare(
      'INSERT INTO backups (guild_id, backup_name, created_by, size_bytes, file_path, includes) VALUES (?, ?, ?, ?, ?, ?)'
    );
    return stmt.run(guildId, backupName, createdBy, sizeBytes, filePath, JSON.stringify(includes));
  }

  public getBackups(guildId: string) {
    const stmt = this.db.prepare(
      'SELECT * FROM backups WHERE guild_id = ? ORDER BY created_at DESC'
    );
    return stmt.all(guildId);
  }

  public getBackup(backupId: number) {
    const stmt = this.db.prepare('SELECT * FROM backups WHERE id = ?');
    return stmt.get(backupId);
  }

  public deleteBackup(backupId: number) {
    const stmt = this.db.prepare('DELETE FROM backups WHERE id = ?');
    return stmt.run(backupId);
  }

  public logDashboardAction(
    userId: string,
    username: string,
    discriminator: string,
    actionType: string,
    guildId: string | null = null,
    guildName: string | null = null,
    resource: string | null = null,
    method: string | null = null,
    ipAddress: string | null = null,
    userAgent: string | null = null,
    details: any = null,
    success: boolean = true,
    errorMessage: string | null = null
  ) {
    const stmt = this.db.prepare(`
      INSERT INTO dashboard_audit (
        user_id, username, discriminator, action_type, guild_id, guild_name,
        resource, method, ip_address, user_agent, details, success, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      userId,
      username,
      discriminator,
      actionType,
      guildId,
      guildName,
      resource,
      method,
      ipAddress,
      userAgent,
      details ? JSON.stringify(details) : null,
      success ? 1 : 0,
      errorMessage
    );
  }

  public getDashboardAuditLogs(options: {
    userId?: string;
    guildId?: string;
    actionType?: string;
    limit?: number;
    offset?: number;
    startDate?: number;
    endDate?: number;
  } = {}) {
    const {
      userId,
      guildId,
      actionType,
      limit = 100,
      offset = 0,
      startDate,
      endDate
    } = options;

    let query = 'SELECT * FROM dashboard_audit WHERE 1=1';
    const params: any[] = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    if (guildId) {
      query += ' AND guild_id = ?';
      params.push(guildId);
    }

    if (actionType) {
      query += ' AND action_type = ?';
      params.push(actionType);
    }

    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  public getDashboardAuditStats(userId?: string, guildId?: string) {
    let query = `
      SELECT
        action_type,
        COUNT(*) as count,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed
      FROM dashboard_audit
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    if (guildId) {
      query += ' AND guild_id = ?';
      params.push(guildId);
    }

    query += ' GROUP BY action_type ORDER BY count DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  public clearDashboardAuditLogs(olderThanTimestamp: number) {
    const stmt = this.db.prepare('DELETE FROM dashboard_audit WHERE timestamp < ?');
    return stmt.run(olderThanTimestamp);
  }
}
