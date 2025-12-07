import { Bot } from './client/Bot.js';
import { env, validateEnvironment } from './config/environment.js';
import { logger } from './utils/logger.js';
import { consoleLogger } from './utils/console-logger.js';
import { startDashboard } from './dashboard/server.js';
import { ShutdownHandler } from './utils/shutdown-handler.js';

async function main() {
  try {
    validateEnvironment();

    const bot = new Bot();
    const shutdownHandler = ShutdownHandler.getInstance();

    shutdownHandler.initialize(bot);

    await bot.start(env.discordToken!);

    startDashboard(bot);

    logger.success('Bot is now online and ready!');
  } catch (error) {
    logger.error('Fatal error during startup', error);
    process.exit(1);
  }
}

main();
