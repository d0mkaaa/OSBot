import { Router } from 'express';
import { DatabaseManager } from '../../database/Database.js';
import { isAuthenticated, hasGuildAccess } from '../middleware/auth-check.js';
import { validateGuildConfig, validateAutomod, validateRule } from '../middleware/validate-input.js';
import { strictRateLimit, moderateRateLimit, relaxedRateLimit, perGuildRateLimit } from '../middleware/rate-limit.js';
import { requireTicketsEnabled, requireModerationEnabled } from '../middleware/module-check.js';
import { logger } from '../../utils/logger.js';
import { getSupportedLocales } from '../../utils/locale-manager.js';
import { HealthMonitor } from '../../utils/health-monitor.js';
import logsRouter from './logs.js';
import { createChatRoutes } from './chat.js';
import { createPermissionsRoutes } from './permissions.js';
import { createAppealsRoutes } from './appeals.js';
import { createAnalyticsRoutes } from './analytics.js';
import { createBulkActionsRoutes } from './bulk-actions.js';
import { createBackupsRoutes } from './backups.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();
const db = DatabaseManager.getInstance();

router.use('/logs', logsRouter);

router.get('/guilds/:guildId', isAuthenticated, hasGuildAccess, async (req, res) => {
  try {
    const client = (req as any).app.get('discordClient');
    const guild = await client.guilds.fetch(req.params.guildId);
    res.json({
      success: true,
      data: {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL(),
        memberCount: guild.memberCount
      }
    });
  } catch (error) {
    logger.error('Failed to fetch guild info:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch guild info' });
  }
});

router.get('/guilds/:guildId/users/:userId', isAuthenticated, hasGuildAccess, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || userId === 'null' || userId === 'undefined') {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }

    const client = (req as any).app.get('discordClient');
    const guild = await client.guilds.fetch(req.params.guildId);

    try {
      const member = await guild.members.fetch(userId);
      res.json({
        success: true,
        data: {
          id: member.user.id,
          username: member.user.username,
          discriminator: member.user.discriminator,
          avatar: member.user.displayAvatarURL(),
          nickname: member.nickname,
          joinedAt: member.joinedAt
        }
      });
    } catch (fetchError: any) {
      if (fetchError.code === 10007 || fetchError.code === 10013) {
        try {
          const user = await client.users.fetch(req.params.userId);
          res.json({
            success: true,
            data: {
              id: user.id,
              username: user.username,
              discriminator: user.discriminator,
              avatar: user.displayAvatarURL(),
              nickname: null,
              joinedAt: null
            }
          });
        } catch {
          res.json({
            success: true,
            data: {
              id: req.params.userId,
              username: 'Unknown User',
              discriminator: '0000',
              avatar: null,
              nickname: null,
              joinedAt: null
            }
          });
        }
      } else {
        throw fetchError;
      }
    }
  } catch (error) {
    logger.error('Failed to fetch user info:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user info' });
  }
});

router.get('/guilds/:guildId/config', isAuthenticated, hasGuildAccess, relaxedRateLimit, (req, res) => {
  try {
    const guildData = db.getGuild(req.params.guildId);
    res.json({ success: true, data: guildData });
  } catch (error) {
    logger.error('Failed to fetch guild config:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch guild config' });
  }
});

router.patch('/guilds/:guildId/config', isAuthenticated, hasGuildAccess, strictRateLimit, validateGuildConfig, (req, res) => {
  try {
    const success = db.updateGuild(req.params.guildId, req.body);
    res.json({ success });
  } catch (error) {
    logger.error('Failed to update guild config:', error);
    res.status(500).json({ success: false, error: 'Failed to update guild config' });
  }
});

router.get('/guilds/:guildId/tickets', isAuthenticated, hasGuildAccess, requireTicketsEnabled, (req, res) => {
  try {
    const tickets = db.getAllTickets(req.params.guildId);
    res.json({ success: true, data: tickets });
  } catch (error) {
    logger.error('Failed to fetch tickets:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
  }
});

router.get('/guilds/:guildId/tickets/:ticketId/transcript', isAuthenticated, hasGuildAccess, requireTicketsEnabled, async (req, res) => {
  try {
    const client = (req as any).app.get('discordClient');
    const ticket = db.getTicketById(parseInt(req.params.ticketId)) as any;

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    logger.info(`Fetching transcript for ticket #${req.params.ticketId} - Status: ${ticket.status}, Has transcript: ${!!ticket.transcript}`);

    if (ticket.status === 'closed' && ticket.transcript) {
      try {
        const transcriptData = JSON.parse(ticket.transcript);
        logger.info(`Returning transcript from database for ticket #${req.params.ticketId}`);
        return res.json({ success: true, data: transcriptData, source: 'database' });
      } catch (parseError) {
        logger.error('Failed to parse stored transcript:', parseError);
      }
    }

    if (ticket.status === 'closed' && !ticket.transcript) {
      logger.warn(`Ticket #${req.params.ticketId} is closed but has no transcript stored`);
      return res.status(404).json({
        success: false,
        error: 'Ticket transcript not available. The ticket was closed but no transcript was saved.'
      });
    }

    try {
      const channel = await client.channels.fetch(ticket.channel_id);
      if (!channel || !channel.isTextBased()) {
        return res.status(404).json({ success: false, error: 'Ticket channel not found' });
      }

      const messages = await channel.messages.fetch({ limit: 100 });
      const transcript = messages.reverse().map((msg: any) => ({
        id: msg.id,
        author: {
          id: msg.author.id,
          username: msg.author.username,
          discriminator: msg.author.discriminator,
          avatar: msg.author.displayAvatarURL(),
          bot: msg.author.bot
        },
        content: msg.content,
        timestamp: msg.createdTimestamp,
        attachments: msg.attachments.map((att: any) => ({
          url: att.url,
          name: att.name,
          contentType: att.contentType
        })),
        embeds: msg.embeds.map((embed: any) => ({
          title: embed.title,
          description: embed.description,
          color: embed.color
        }))
      }));

      logger.info(`Returning transcript from channel for ticket #${req.params.ticketId}`);
      res.json({ success: true, data: transcript, source: 'channel' });
    } catch (channelError) {
      logger.error('Failed to fetch ticket channel:', channelError);
      res.status(404).json({ success: false, error: 'Ticket channel no longer exists' });
    }
  } catch (error) {
    logger.error('Failed to fetch ticket transcript:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ticket transcript' });
  }
});

router.delete('/guilds/:guildId/tickets/:ticketId', isAuthenticated, hasGuildAccess, requireTicketsEnabled, (req, res) => {
  try {
    db.closeTicket(req.params.ticketId, 'dashboard_user');
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to close ticket:', error);
    res.status(500).json({ success: false, error: 'Failed to close ticket' });
  }
});

router.get('/guilds/:guildId/warnings', isAuthenticated, hasGuildAccess, requireModerationEnabled, (req, res) => {
  try {
    let warnings = db.getAllWarnings(req.params.guildId);

    const { userId, moderatorId, search } = req.query;

    if (userId) {
      warnings = warnings.filter((w: any) => w.user_id === userId);
    }

    if (moderatorId) {
      warnings = warnings.filter((w: any) => w.moderator_id === moderatorId);
    }

    if (search) {
      const searchTerm = (search as string).toLowerCase();
      warnings = warnings.filter((w: any) =>
        w.user_id?.toLowerCase().includes(searchTerm) ||
        w.moderator_id?.toLowerCase().includes(searchTerm) ||
        w.reason?.toLowerCase().includes(searchTerm)
      );
    }

    res.json({ success: true, data: warnings });
  } catch (error) {
    logger.error('Failed to fetch warnings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch warnings' });
  }
});

router.delete('/guilds/:guildId/warnings/:warningId', isAuthenticated, hasGuildAccess, requireModerationEnabled, strictRateLimit, (req, res) => {
  try {
    db.removeWarning(parseInt(req.params.warningId));
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to remove warning:', error);
    res.status(500).json({ success: false, error: 'Failed to remove warning' });
  }
});

router.get('/guilds/:guildId/logs', isAuthenticated, hasGuildAccess, (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    let logs = db.getAuditLogs(req.params.guildId, limit);

    const { actionType, moderatorId, targetId, search } = req.query;

    if (actionType) {
      logs = logs.filter((log: any) => log.action_type === actionType);
    }

    if (moderatorId) {
      logs = logs.filter((log: any) => log.moderator_id === moderatorId);
    }

    if (targetId) {
      logs = logs.filter((log: any) => log.target_id === targetId);
    }

    if (search) {
      const searchTerm = (search as string).toLowerCase();
      logs = logs.filter((log: any) =>
        log.action_type?.toLowerCase().includes(searchTerm) ||
        log.moderator_id?.toLowerCase().includes(searchTerm) ||
        log.target_id?.toLowerCase().includes(searchTerm) ||
        log.reason?.toLowerCase().includes(searchTerm)
      );
    }

    res.json({ success: true, data: logs });
  } catch (error) {
    logger.error('Failed to fetch logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
});

router.get('/guilds/:guildId/stats', isAuthenticated, hasGuildAccess, async (req, res) => {
  try {
    logger.info(`Fetching stats for guild ${req.params.guildId}`);
    const tickets = db.getAllTickets(req.params.guildId) as any[];
    logger.info(`Found ${tickets.length} tickets`);
    const warnings = db.getAllWarnings(req.params.guildId) as any[];
    logger.info(`Found ${warnings.length} warnings`);
    const logs = db.getAuditLogs(req.params.guildId, 100) as any[];
    logger.info(`Found ${logs.length} logs`);

    const healthMonitor = HealthMonitor.getInstance();
    const healthMetrics = await healthMonitor.checkHealth();

    const stats = {
      tickets: {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        closed: tickets.filter(t => t.status === 'closed').length
      },
      warnings: {
        total: warnings.length,
        recent: warnings.slice(0, 10)
      },
      moderation: {
        total: logs.length,
        kicks: logs.filter(l => l.action_type === 'kick').length,
        bans: logs.filter(l => l.action_type === 'ban').length,
        mutes: logs.filter(l => l.action_type === 'mute').length
      },
      health: {
        status: healthMetrics.status,
        uptime: healthMetrics.uptime,
        memory: healthMetrics.memory,
        database: healthMetrics.database,
        discord: healthMetrics.discord,
        errors: healthMetrics.errors
      }
    };

    logger.info(`Stats calculated successfully`);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Failed to fetch stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

router.get('/guilds/:guildId/automod', isAuthenticated, hasGuildAccess, relaxedRateLimit, (req, res) => {
  try {
    const automod = db.getAutomodSettings(req.params.guildId);
    res.json({ success: true, data: automod });
  } catch (error) {
    logger.error('Failed to fetch automod config:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch automod config' });
  }
});

router.patch('/guilds/:guildId/automod', isAuthenticated, hasGuildAccess, strictRateLimit, validateAutomod, (req, res) => {
  try {
    const data: any = {};
    for (const [key, value] of Object.entries(req.body)) {
      data[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
    }
    const success = db.updateAutomodSettings(req.params.guildId, data);
    res.json({ success });
  } catch (error) {
    logger.error('Failed to update automod config:', error);
    res.status(500).json({ success: false, error: 'Failed to update automod config' });
  }
});

router.get('/guilds/:guildId/rules', isAuthenticated, hasGuildAccess, (req, res) => {
  try {
    const rules = db.getRules(req.params.guildId);
    res.json({ success: true, data: rules });
  } catch (error) {
    logger.error('Failed to fetch rules:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch rules' });
  }
});

router.post('/guilds/:guildId/rules', isAuthenticated, hasGuildAccess, moderateRateLimit, validateRule, (req, res) => {
  try {
    const { title, description } = req.body;
    const rules = db.getRules(req.params.guildId) as any[];
    const nextRuleNumber = rules.length > 0 ? Math.max(...rules.map(r => r.rule_number)) + 1 : 1;
    db.createRule(req.params.guildId, nextRuleNumber, title, description);
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to add rule:', error);
    res.status(500).json({ success: false, error: 'Failed to add rule' });
  }
});

router.delete('/guilds/:guildId/rules/:ruleId', isAuthenticated, hasGuildAccess, moderateRateLimit, (req, res) => {
  try {
    db.deleteRule(req.params.guildId, parseInt(req.params.ruleId));
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to remove rule:', error);
    res.status(500).json({ success: false, error: 'Failed to remove rule' });
  }
});

router.get('/locales', (req, res) => {
  try {
    const locales = getSupportedLocales();
    res.json({ success: true, data: locales });
  } catch (error) {
    logger.error('Failed to fetch locales:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch locales' });
  }
});

router.get('/health', async (req, res) => {
  try {
    const healthMonitor = HealthMonitor.getInstance();
    const metrics = await healthMonitor.checkHealth();
    res.status(metrics.status === 'unhealthy' ? 503 : 200).json({
      success: metrics.status !== 'unhealthy',
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to fetch health metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch health metrics' });
  }
});

router.use((req, res, next) => {
  const client = (req as any).app.get('discordClient');
  (req as any).discordClient = client;
  next();
});

router.get('/docs', isAuthenticated, (req, res) => {
  try {
    const rootDir = join(__dirname, '..', '..', '..');
    const availableDocs = [
      { id: 'commands', name: 'Commands Reference', file: 'COMMANDS.md', icon: '📖' },
      { id: 'dashboard', name: 'Dashboard Guide', file: 'DASHBOARD.md', icon: '📊' },
      { id: 'configuration', name: 'Configuration', file: 'CONFIGURATION.md', icon: '⚙️' },
      { id: 'setup', name: 'Setup Guide', file: 'SETUP.md', icon: '🚀' },
      { id: 'localization', name: 'Localization', file: 'LOCALIZATION.md', icon: '🌐' },
      { id: 'systems', name: 'Bot Systems', file: 'SYSTEMS.md', icon: '🔧' },
      { id: 'readme', name: 'README', file: 'README.md', icon: '📋' }
    ];

    res.json({ success: true, data: availableDocs });
  } catch (error) {
    logger.error('Failed to fetch docs list:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch documentation list' });
  }
});

router.get('/docs/:docId', isAuthenticated, (req, res) => {
  try {
    const { docId } = req.params;
    const rootDir = join(__dirname, '..', '..', '..');

    const docMap: Record<string, string> = {
      'commands': 'COMMANDS.md',
      'dashboard': 'DASHBOARD.md',
      'configuration': 'CONFIGURATION.md',
      'setup': 'SETUP.md',
      'localization': 'LOCALIZATION.md',
      'systems': 'SYSTEMS.md',
      'readme': 'README.md'
    };

    const fileName = docMap[docId];
    if (!fileName) {
      return res.status(404).json({ success: false, error: 'Documentation not found' });
    }

    const filePath = join(rootDir, fileName);
    const content = readFileSync(filePath, 'utf-8');

    res.json({ success: true, data: { content, fileName } });
  } catch (error) {
    logger.error('Failed to fetch documentation:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch documentation' });
  }
});

router.get('/dashboard-audit', isAuthenticated, (req, res) => {
  try {
    const user = req.user as any;
    const { userId, guildId, actionType, search, success, limit, offset, startDate, endDate } = req.query;

    const options = {
      userId: userId as string,
      guildId: guildId as string,
      actionType: actionType as string,
      search: search as string,
      success: success === 'true' ? true : success === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0,
      startDate: startDate ? parseInt(startDate as string) : undefined,
      endDate: endDate ? parseInt(endDate as string) : undefined
    };

    const logs = db.getDashboardAuditLogs(options);
    const total = db.getDashboardAuditCount(options);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: options.limit,
        offset: options.offset,
        hasMore: options.offset + logs.length < total
      }
    });
  } catch (error) {
    logger.error('Failed to fetch dashboard audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

router.get('/dashboard-audit/stats', isAuthenticated, (req, res) => {
  try {
    const { userId, guildId, startDate, endDate } = req.query;

    const stats = db.getDashboardAuditStats({
      userId: userId as string | undefined,
      guildId: guildId as string | undefined,
      startDate: startDate ? parseInt(startDate as string) : undefined,
      endDate: endDate ? parseInt(endDate as string) : undefined
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Failed to fetch dashboard audit stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

router.get('/dashboard-audit/summary', isAuthenticated, (req, res) => {
  try {
    const { userId, guildId, startDate, endDate } = req.query;

    const summary = db.getDashboardAuditSummary({
      userId: userId as string | undefined,
      guildId: guildId as string | undefined,
      startDate: startDate ? parseInt(startDate as string) : undefined,
      endDate: endDate ? parseInt(endDate as string) : undefined
    });

    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Failed to fetch dashboard audit summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch summary' });
  }
});

router.get('/dashboard-audit/export', isAuthenticated, (req, res) => {
  try {
    const { userId, guildId, actionType, search, success, startDate, endDate, format } = req.query;

    const logs = db.getDashboardAuditLogs({
      userId: userId as string,
      guildId: guildId as string,
      actionType: actionType as string,
      search: search as string,
      success: success === 'true' ? true : success === 'false' ? false : undefined,
      limit: 10000,
      offset: 0,
      startDate: startDate ? parseInt(startDate as string) : undefined,
      endDate: endDate ? parseInt(endDate as string) : undefined
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
      res.json(logs);
    } else {
      const csv = [
        ['Time', 'User', 'User ID', 'Action', 'Guild', 'Guild ID', 'IP Address', 'Method', 'Resource', 'Success', 'Error'].join(','),
        ...logs.map((log: any) => [
          new Date(log.timestamp * 1000).toISOString(),
          `"${log.username}#${log.discriminator}"`,
          log.user_id,
          log.action_type,
          `"${log.guild_name || 'N/A'}"`,
          log.guild_id || 'N/A',
          log.ip_address || 'N/A',
          log.method || 'N/A',
          `"${log.resource || 'N/A'}"`,
          log.success ? 'Yes' : 'No',
          `"${log.error_message || ''}"`
        ].join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
      res.send(csv);
    }
  } catch (error) {
    logger.error('Failed to export audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to export audit logs' });
  }
});

router.get('/user/settings', isAuthenticated, (req, res) => {
  try {
    const user = req.user as any;
    const settings = db.getDashboardUserSettings(user.id);

    if (!settings) {
      db.createOrUpdateDashboardUserSettings(user.id, user.username, user.discriminator || '0');
      const newSettings = db.getDashboardUserSettings(user.id);
      return res.json({ success: true, data: newSettings });
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error('Failed to fetch user settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user settings' });
  }
});

router.patch('/user/settings', isAuthenticated, (req, res) => {
  try {
    const user = req.user as any;
    const { email_notifications, security_alerts, session_timeout, theme } = req.body;

    db.createOrUpdateDashboardUserSettings(user.id, user.username, user.discriminator || '0', {
      email_notifications,
      security_alerts,
      session_timeout,
      theme
    });

    const updated = db.getDashboardUserSettings(user.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Failed to update user settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update user settings' });
  }
});

router.get('/user/sessions', isAuthenticated, (req, res) => {
  try {
    const user = req.user as any;
    const sessions = db.getDashboardSessions(user.id);

    res.json({ success: true, data: sessions });
  } catch (error) {
    logger.error('Failed to fetch sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

router.delete('/user/sessions/:sessionId', isAuthenticated, (req, res) => {
  try {
    const { sessionId } = req.params;
    db.deleteDashboardSession(sessionId);

    res.json({ success: true, message: 'Session terminated' });
  } catch (error) {
    logger.error('Failed to delete session:', error);
    res.status(500).json({ success: false, error: 'Failed to delete session' });
  }
});

router.delete('/user/sessions', isAuthenticated, (req, res) => {
  try {
    const user = req.user as any;
    db.deleteAllDashboardSessions(user.id);

    res.json({ success: true, message: 'All sessions terminated' });
  } catch (error) {
    logger.error('Failed to delete all sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to delete all sessions' });
  }
});

export function initializeNewRoutes(app: any, client: any) {
  app.use('/api', createChatRoutes(client));
  app.use('/api', createPermissionsRoutes(client));
  app.use('/api', createAppealsRoutes(client));
  app.use('/api', createAnalyticsRoutes(client));
  app.use('/api', createBulkActionsRoutes(client));
  app.use('/api', createBackupsRoutes(client));
}

export default router;
