import { Client } from 'discord.js';
import { logger } from './logger.js';
import { DatabaseManager } from '../database/Database.js';
import { BackupManager } from './backup-manager.js';

export class ShutdownHandler {
  private static instance: ShutdownHandler | null = null;
  private client: Client | null = null;
  private isShuttingDown = false;
  private shutdownTimeout = 30000;
  private activeOperations = new Set<string>();

  private constructor() {}

  public static getInstance(): ShutdownHandler {
    if (!ShutdownHandler.instance) {
      ShutdownHandler.instance = new ShutdownHandler();
    }
    return ShutdownHandler.instance;
  }

  public initialize(client: Client): void {
    this.client = client;
    this.registerSignalHandlers();
    logger.info('Shutdown handler initialized');
  }

  private registerSignalHandlers(): void {
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
    process.on('SIGQUIT', () => this.handleShutdown('SIGQUIT'));

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', error);
      this.handleShutdown('uncaughtException', true);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
    });
  }

  public async handleShutdown(signal: string, immediate = false): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, forcing exit...');
      process.exit(1);
      return;
    }

    this.isShuttingDown = true;

    logger.info(`Received ${signal}, initiating graceful shutdown...`);

    const shutdownTimer = setTimeout(() => {
      logger.error('Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      if (immediate) {
        logger.warn('Immediate shutdown requested, skipping graceful operations');
        await this.forceShutdown();
      } else {
        await this.gracefulShutdown();
      }

      clearTimeout(shutdownTimer);
      logger.success('Shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimer);
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('Starting graceful shutdown sequence...');

    logger.info('Step 1/5: Waiting for active operations to complete...');
    await this.waitForActiveOperations();

    logger.info('Step 2/5: Creating final backup...');
    await this.createFinalBackup();

    logger.info('Step 3/5: Closing database connections...');
    await this.closeDatabaseConnections();

    logger.info('Step 4/5: Disconnecting from Discord...');
    await this.disconnectClient();

    logger.info('Step 5/5: Cleanup complete');
  }

  private async forceShutdown(): Promise<void> {
    logger.warn('Performing forced shutdown...');

    try {
      await this.closeDatabaseConnections();
    } catch (error) {
      logger.error('Error closing database', error);
    }

    try {
      await this.disconnectClient();
    } catch (error) {
      logger.error('Error disconnecting client', error);
    }
  }

  private async waitForActiveOperations(): Promise<void> {
    if (this.activeOperations.size === 0) {
      logger.info('No active operations to wait for');
      return;
    }

    logger.info(`Waiting for ${this.activeOperations.size} active operations...`);

    const maxWait = 10000;
    const checkInterval = 100;
    let waited = 0;

    while (this.activeOperations.size > 0 && waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    if (this.activeOperations.size > 0) {
      logger.warn(`${this.activeOperations.size} operations still active after ${maxWait}ms`);
    } else {
      logger.info('All active operations completed');
    }
  }

  private async createFinalBackup(): Promise<void> {
    try {
      const backupManager = BackupManager.getInstance();
      const result = await backupManager.createBackup(true);

      if (result.success) {
        logger.success('Final backup created successfully');
      } else {
        logger.error(`Failed to create final backup: ${result.error}`);
      }
    } catch (error) {
      logger.error('Error creating final backup', error);
    }
  }

  private async closeDatabaseConnections(): Promise<void> {
    try {
      const db = DatabaseManager.getInstance();
      db.close();
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error closing database connections', error);
      throw error;
    }
  }

  private async disconnectClient(): Promise<void> {
    try {
      if (this.client && this.client.isReady()) {
        await this.client.destroy();
        logger.info('Discord client disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting Discord client', error);
      throw error;
    }
  }

  public registerOperation(operationId: string): void {
    this.activeOperations.add(operationId);
  }

  public unregisterOperation(operationId: string): void {
    this.activeOperations.delete(operationId);
  }

  public isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  public getActiveOperationsCount(): number {
    return this.activeOperations.size;
  }
}
