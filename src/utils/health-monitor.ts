import { Client } from 'discord.js';
import { logger } from './logger.js';
import { DatabaseManager } from '../database/Database.js';
import { env } from '../config/environment.js';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthMetrics {
  status: HealthStatus;
  timestamp: number;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    connected: boolean;
    responseTime: number;
  };
  discord: {
    connected: boolean;
    ping: number;
    guilds: number;
  };
  errors: string[];
}

export class HealthMonitor {
  private static instance: HealthMonitor | null = null;
  private client: Client | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastMetrics: HealthMetrics | null = null;
  private startTime: number = Date.now();
  private errorCount = 0;
  private maxErrors = 10;

  private constructor() {}

  public static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  public initialize(client: Client): void {
    this.client = client;
    this.startTime = Date.now();
    logger.info('Health monitor initialized');
  }

  public async checkHealth(): Promise<HealthMetrics> {
    const errors: string[] = [];
    let status: HealthStatus = 'healthy';

    const memory = process.memoryUsage();
    const memoryUsed = memory.heapUsed / 1024 / 1024;
    const memoryLimit = env.memoryLimitMB;
    const memoryPercentage = (memoryUsed / memoryLimit) * 100;

    if (memoryPercentage > 90) {
      errors.push('Memory usage critical (>90%)');
      status = 'unhealthy';
    } else if (memoryPercentage > 75) {
      errors.push('Memory usage high (>75%)');
      status = status === 'healthy' ? 'degraded' : status;
    }

    const dbCheck = await this.checkDatabase();
    if (!dbCheck.connected) {
      errors.push('Database connection failed');
      status = 'unhealthy';
    } else if (dbCheck.responseTime > 1000) {
      errors.push('Database response time slow (>1s)');
      status = status === 'healthy' ? 'degraded' : status;
    }

    const discordCheck = this.checkDiscord();
    if (this.client && this.client.isReady()) {
      if (!discordCheck.connected) {
        errors.push('Discord connection lost');
        status = 'unhealthy';
      } else if (discordCheck.ping > 500) {
        errors.push('Discord latency high (>500ms)');
        status = status === 'healthy' ? 'degraded' : status;
      }
    }

    const metrics: HealthMetrics = {
      status,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      memory: {
        used: Math.round(memoryUsed),
        total: memoryLimit,
        percentage: Math.round(memoryPercentage)
      },
      database: dbCheck,
      discord: discordCheck,
      errors
    };

    this.lastMetrics = metrics;

    if (status === 'unhealthy') {
      this.errorCount++;
      logger.error(`Health check failed: ${errors.join(', ')}`);

      if (this.errorCount >= this.maxErrors) {
        logger.error('Critical: Maximum error threshold reached. System may be unstable.');
      }
    } else {
      if (this.errorCount > 0) {
        this.errorCount = Math.max(0, this.errorCount - 1);
      }
      if (status === 'degraded') {
        logger.warn(`Health check degraded: ${errors.join(', ')}`);
      }
    }

    return metrics;
  }

  private async checkDatabase(): Promise<{ connected: boolean; responseTime: number }> {
    try {
      const start = Date.now();
      const db = DatabaseManager.getInstance();
      const dbInstance = db.getDb();

      dbInstance.prepare('SELECT 1').get();

      const responseTime = Date.now() - start;
      return { connected: true, responseTime };
    } catch (error) {
      return { connected: false, responseTime: -1 };
    }
  }

  private checkDiscord(): { connected: boolean; ping: number; guilds: number } {
    if (!this.client || !this.client.isReady()) {
      return { connected: false, ping: 0, guilds: 0 };
    }

    const wsPing = this.client.ws.ping;
    const ping = wsPing < 0 ? 0 : wsPing;

    return {
      connected: this.client.ws.status === 0,
      ping: ping,
      guilds: this.client.guilds.cache.size
    };
  }

  public startMonitoring(intervalMinutes: number = 5): void {
    if (this.checkInterval) {
      this.stopMonitoring();
    }

    const intervalMs = intervalMinutes * 60 * 1000;

    logger.info(`Health monitoring enabled: every ${intervalMinutes} minutes`);

    this.checkInterval = setInterval(async () => {
      const metrics = await this.checkHealth();

      if (metrics.status === 'healthy') {
        logger.info(`Health check passed: ${this.formatUptime(metrics.uptime)} uptime`);
      }
    }, intervalMs);

    this.checkHealth();
  }

  public stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Health monitoring disabled');
    }
  }

  public getLastMetrics(): HealthMetrics | null {
    return this.lastMetrics;
  }

  public getStatus() {
    return {
      enabled: this.checkInterval !== null,
      lastCheck: this.lastMetrics?.timestamp || null,
      errorCount: this.errorCount,
      uptime: Date.now() - this.startTime
    };
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  public formatMetrics(metrics: HealthMetrics): string {
    const lines = [
      `Status: ${metrics.status.toUpperCase()}`,
      `Uptime: ${this.formatUptime(metrics.uptime)}`,
      `Memory: ${metrics.memory.used}MB / ${metrics.memory.total}MB (${metrics.memory.percentage}%)`,
      `Database: ${metrics.database.connected ? `Connected (${metrics.database.responseTime}ms)` : 'Disconnected'}`,
      `Discord: ${metrics.discord.connected ? `Connected (${metrics.discord.ping}ms, ${metrics.discord.guilds} guilds)` : 'Disconnected'}`
    ];

    if (metrics.errors.length > 0) {
      lines.push(`Errors: ${metrics.errors.join(', ')}`);
    }

    return lines.join('\n');
  }
}
