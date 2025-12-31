import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import { setupAuth } from './auth.js';
import { isOwner } from './middleware/auth-check.js';
import apiRouter, { initializeNewRoutes } from './routes/api.js';
import automodFiltersRouter from './routes/automod-filters.js';
import xpBoostersRouter from './routes/xp-boosters.js';
import musicRouter from './routes/music.js';
import antiraidRouter from './routes/antiraid.js';
import { setupWebSocketServer } from './websocket.js';
import { DatabaseManager } from '../database/Database.js';
import { auditLogger } from './middleware/audit-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createDashboardServer(client: any) {
  const app = express();

  app.set('discordClient', client);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(session({
    secret: env.dashboardSessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 86400000,
      secure: env.environment === 'production',
      httpOnly: true
    }
  }));

  const authPassport = setupAuth(client);
  app.use(authPassport.initialize());
  app.use(authPassport.session());

  app.use(auditLogger);

  app.use(express.static(join(__dirname, 'public')));

  app.get('/auth/login', passport.authenticate('discord'));

  app.get('/auth/callback',
    passport.authenticate('discord', { failureRedirect: '/login-failed' }),
    (req, res) => {
      const user = req.user as any;
      const db = DatabaseManager.getInstance();

      db.logDashboardAction(
        user.id,
        user.username,
        user.discriminator || '0',
        'LOGIN',
        null,
        null,
        '/auth/callback',
        'GET',
        req.ip || req.socket.remoteAddress,
        req.get('user-agent'),
        { guilds_count: user.guilds?.length || 0 },
        true
      );

      res.redirect('/');
    }
  );

  app.get('/auth/logout', (req, res) => {
    const user = req.user as any;
    const db = DatabaseManager.getInstance();

    if (user) {
      db.logDashboardAction(
        user.id,
        user.username,
        user.discriminator || '0',
        'LOGOUT',
        null,
        null,
        '/auth/logout',
        'GET',
        req.ip || req.socket.remoteAddress,
        req.get('user-agent')
      );
    }

    req.logout(() => {
      res.redirect('/');
    });
  });

  app.get('/auth/user', (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      const botOwners = env.botOwners.split(',').map(id => id.trim()).filter(id => id);
      const isOwnerUser = botOwners.length === 0 || botOwners.includes(user.id);

      const botGuildIds = client.guilds.cache.map((g: any) => g.id);

      const userGuildsWithBotStatus = (user.guilds || []).map((guild: any) => ({
        ...guild,
        botInGuild: botGuildIds.includes(guild.id)
      }));

      res.json({
        authenticated: true,
        user: {
          ...user,
          guilds: userGuildsWithBotStatus
        },
        isOwner: isOwnerUser,
        botClientId: env.clientId
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  const ownerCheckEnabled = env.botOwners.split(',').map(id => id.trim()).filter(id => id).length > 0;

  if (ownerCheckEnabled) {
    logger.info('Dashboard owner verification enabled');
    app.use('/api', isOwner, apiRouter);
    app.use('/api', isOwner, automodFiltersRouter);
    app.use('/api', isOwner, xpBoostersRouter);
    app.use('/api', isOwner, musicRouter);
    app.use('/api/antiraid', isOwner, antiraidRouter);
  } else {
    logger.info('Dashboard owner verification disabled (no BOT_OWNERS set)');
    app.use('/api', apiRouter);
    app.use('/api', automodFiltersRouter);
    app.use('/api', xpBoostersRouter);
    app.use('/api', musicRouter);
    app.use('/api/antiraid', antiraidRouter);
  }

  initializeNewRoutes(app, client);

  app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
  });

  return app;
}

export function startDashboard(client: any) {
  if (!env.dashboardEnabled) {
    logger.info('Dashboard is disabled');
    return null;
  }

  if (!env.oauth2ClientSecret) {
    logger.warn('Dashboard enabled but OAUTH2_CLIENT_SECRET not set. Dashboard will not start.');
    return null;
  }

  const app = createDashboardServer(client);

  const server = app.listen(env.dashboardPort, () => {
    logger.info(`Dashboard server running at ${env.dashboardUrl}`);
    logger.info(`Login at: ${env.dashboardUrl}/auth/login`);
  });

  setupWebSocketServer(server);

  return server;
}
