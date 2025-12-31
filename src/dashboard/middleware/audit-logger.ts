import { Request, Response, NextFunction } from 'express';
import { DatabaseManager } from '../../database/Database.js';

export function auditLogger(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return next();
  }

  const user = req.user as any;
  const db = DatabaseManager.getInstance();

  const originalSend = res.send;
  const originalJson = res.json;

  let responseBody: any;
  let statusCode: number;

  res.send = function (body: any): Response {
    responseBody = body;
    statusCode = res.statusCode;
    return originalSend.call(this, body);
  };

  res.json = function (body: any): Response {
    responseBody = body;
    statusCode = res.statusCode;
    return originalJson.call(this, body);
  };

  res.on('finish', () => {
    const method = req.method;
    const resource = req.path;

    if (shouldLogAction(method, resource)) {
      const guildId = extractGuildId(req);
      const actionType = determineActionType(method, resource);

      let guildName = null;
      if (guildId && (req as any).guild) {
        guildName = (req as any).guild.name;
      }

      const details: any = {
        query: req.query,
        params: req.params
      };

      if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
        details.body = sanitizeBody(req.body);
      }

      const success = statusCode >= 200 && statusCode < 400;
      let errorMessage = null;

      if (!success && responseBody) {
        try {
          const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
          errorMessage = parsed.error || parsed.message || null;
        } catch (e) {
        }
      }

      db.logDashboardAction(
        user.id,
        user.username,
        user.discriminator || '0',
        actionType,
        guildId,
        guildName,
        resource,
        method,
        req.ip || req.socket.remoteAddress,
        req.get('user-agent'),
        details,
        success,
        errorMessage
      );
    }
  });

  next();
}

function shouldLogAction(method: string, resource: string): boolean {
  if (resource.startsWith('/auth/user')) return false;
  if (resource.startsWith('/auth/callback')) return false;
  if (resource === '/api/health') return false;
  if (resource.includes('/music/') && resource.endsWith('/volume')) return false;

  const modifyingMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
  const importantGets = [
    '/api/guilds/',
    '/api/docs'
  ];

  if (modifyingMethods.includes(method)) {
    return true;
  }

  if (method === 'GET') {
    return importantGets.some(path => resource.startsWith(path));
  }

  return false;
}

function extractGuildId(req: Request): string | null {
  if (req.params.guildId) {
    return req.params.guildId;
  }

  if (req.body?.guild_id) {
    return req.body.guild_id;
  }

  const match = req.path.match(/\/guilds\/(\d+)/);
  return match ? match[1] : null;
}

function determineActionType(method: string, resource: string): string {
  if (resource.includes('/config')) {
    return method === 'GET' ? 'VIEW_CONFIG' : 'UPDATE_CONFIG';
  }

  if (resource.includes('/warnings')) {
    if (method === 'DELETE') return 'DELETE_WARNING';
    return 'VIEW_WARNINGS';
  }

  if (resource.includes('/logs')) {
    return 'VIEW_AUDIT_LOGS';
  }

  if (resource.includes('/automod')) {
    return method === 'GET' ? 'VIEW_AUTOMOD' : 'UPDATE_AUTOMOD';
  }

  if (resource.includes('/tickets')) {
    return 'VIEW_TICKETS';
  }

  if (resource.includes('/analytics')) {
    return 'VIEW_ANALYTICS';
  }

  if (resource.includes('/appeals')) {
    if (method === 'POST') return 'CREATE_APPEAL';
    if (method === 'PATCH') return 'UPDATE_APPEAL';
    if (method === 'DELETE') return 'DELETE_APPEAL';
    return 'VIEW_APPEALS';
  }

  if (resource.includes('/bulk-actions')) {
    if (method === 'POST') return 'EXECUTE_BULK_ACTION';
    return 'VIEW_BULK_ACTIONS';
  }

  if (resource.includes('/backups')) {
    if (method === 'POST') return 'CREATE_BACKUP';
    if (method === 'DELETE') return 'DELETE_BACKUP';
    return 'VIEW_BACKUPS';
  }

  if (resource.includes('/guilds') && method === 'GET') {
    return 'ACCESS_GUILD';
  }

  if (resource.includes('/docs')) {
    return 'VIEW_DOCUMENTATION';
  }

  return `${method}_${resource.split('/').filter(Boolean).join('_')}`.toUpperCase();
}

function sanitizeBody(body: any): any {
  if (!body) return null;

  const sanitized = { ...body };

  const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'accessToken'];
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
}
