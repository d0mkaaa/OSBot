import { config } from 'dotenv';
import { randomBytes } from 'crypto';

config();

function generateSessionSecret(): string {
  return randomBytes(32).toString('hex');
}

function getSessionSecret(): string {
  const secret = process.env.DASHBOARD_SESSION_SECRET;
  const isProd = (process.env.NODE_ENV || 'development') === 'production';

  if (!secret || secret === 'change-this-secret') {
    if (isProd) {
      throw new Error('DASHBOARD_SESSION_SECRET must be set to a strong secret in production');
    }
    return generateSessionSecret();
  }

  if (secret.length < 32) {
    if (isProd) {
      throw new Error('DASHBOARD_SESSION_SECRET must be at least 32 characters long in production');
    }
    console.warn('WARNING: DASHBOARD_SESSION_SECRET is too short (should be at least 32 characters)');
  }

  return secret;
}

export const env = {
  discordToken: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  databasePath: process.env.DATABASE_PATH || './data/bot.db',
  botOwners: process.env.BOT_OWNERS || '',

  logLevel: process.env.LOG_LEVEL || 'info',
  environment: process.env.NODE_ENV || 'development',

  dashboardEnabled: process.env.DASHBOARD_ENABLED === 'true',
  dashboardPort: parseInt(process.env.DASHBOARD_PORT || '3000', 10),
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:3000',
  dashboardSessionSecret: getSessionSecret(),
  oauth2ClientSecret: process.env.OAUTH2_CLIENT_SECRET,

  backupEnabled: process.env.BACKUP_ENABLED !== 'false',
  backupDir: process.env.BACKUP_DIR || './backups',
  backupInterval: parseInt(process.env.BACKUP_INTERVAL_HOURS || '24', 10),
  backupRetention: parseInt(process.env.BACKUP_RETENTION || '7', 10),

  healthCheckEnabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL_MINUTES || '5', 10),

  memoryLimitMB: parseInt(process.env.MEMORY_LIMIT_MB || '512', 10),
} as const;

export const isProduction = () => env.environment === 'production';
export const isDevelopment = () => env.environment === 'development';
export const isTest = () => env.environment === 'test';

export function validateEnvironment(): void {
  const errors: string[] = [];

  if (!env.discordToken) {
    errors.push('DISCORD_TOKEN is required in .env file');
  }

  if (!env.clientId) {
    errors.push('CLIENT_ID is required in .env file');
  }

  if (isProduction()) {
    if (env.dashboardEnabled && !env.oauth2ClientSecret) {
      errors.push('OAUTH2_CLIENT_SECRET is required when dashboard is enabled in production');
    }

    if (env.dashboardEnabled && env.dashboardUrl.includes('localhost')) {
      console.warn('WARNING: DASHBOARD_URL contains localhost in production environment');
    }

    if (!env.botOwners) {
      console.warn('WARNING: BOT_OWNERS is not set - owner-only commands will be unavailable');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  console.log(`Starting bot in ${env.environment.toUpperCase()} mode`);
  if (env.dashboardEnabled) {
    console.log(`Dashboard enabled at ${env.dashboardUrl}`);
  }
}
