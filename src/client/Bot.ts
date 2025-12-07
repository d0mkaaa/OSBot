import { Client, Collection } from 'discord.js';
import { BotClient, Command } from '../types/index.js';
import { botConfig } from '../config/bot.js';
import { loadCommands } from '../handlers/command-handler.js';
import { loadEvents } from '../handlers/event-handler.js';
import { logger } from '../utils/logger.js';
import { DatabaseManager } from '../database/Database.js';
import { TempbanChecker } from '../utils/tempban-checker.js';
import { BackupManager } from '../utils/backup-manager.js';
import { HealthMonitor } from '../utils/health-monitor.js';
import { env } from '../config/environment.js';

export class Bot extends Client<true> {
  public commands: Collection<string, Command>;
  public database: DatabaseManager;
  private tempbanChecker: TempbanChecker;
  private backupManager: BackupManager;
  private healthMonitor: HealthMonitor;

  constructor() {
    super({
      intents: botConfig.intents,
      partials: botConfig.partials
    });
    this.commands = new Collection();
    this.database = DatabaseManager.getInstance();
    this.tempbanChecker = new TempbanChecker(this);
    this.backupManager = BackupManager.getInstance();
    this.healthMonitor = HealthMonitor.getInstance();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing bot...');
    await loadCommands(this as unknown as BotClient);
    await loadEvents(this as unknown as BotClient);
  }

  async start(token: string): Promise<void> {
    try {
      await this.initialize();
      await this.login(token);
      this.tempbanChecker.start();

      this.healthMonitor.initialize(this);
      if (env.healthCheckEnabled) {
        this.healthMonitor.startMonitoring(env.healthCheckInterval);
      }

      if (env.backupEnabled) {
        this.backupManager.startAutoBackup(env.backupInterval);
      }
    } catch (error) {
      logger.error('Failed to start bot', error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down bot...');
    this.tempbanChecker.stop();
    this.healthMonitor.stopMonitoring();
    this.backupManager.stopAutoBackup();
    this.database.close();
    await this.destroy();
    process.exit(0);
  }
}
