import { REST, Routes } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { env, validateEnvironment } from './config/environment.js';
import { logger } from './utils/logger.js';
import { Command } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadCommandsFromDirectory(directory: string, commands: any[]): Promise<void> {
  const entries = readdirSync(directory);

  for (const entry of entries) {
    const entryPath = join(directory, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) {
      await loadCommandsFromDirectory(entryPath, commands);
    } else if (entry.endsWith('.ts') || entry.endsWith('.js')) {
      const commandModule = await import(entryPath);
      const command: Command = commandModule.default;

      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
      } else {
        logger.warn(`Command at ${entry} is missing required "data" or "execute" property`);
      }
    }
  }
}

async function deployCommands() {
  try {
    validateEnvironment();

    const commands: any[] = [];
    const commandsPath = join(__dirname, 'commands');

    await loadCommandsFromDirectory(commandsPath, commands);

    const rest = new REST().setToken(env.discordToken!);

    logger.info(`Started refreshing ${commands.length} application (/) commands`);

    if (env.guildId) {
      logger.info('Attempting to deploy to specific guild (faster for testing)...');
      try {
        const data = await rest.put(
          Routes.applicationGuildCommands(env.clientId!, env.guildId),
          { body: commands }
        ) as any[];

        logger.success(`Successfully reloaded ${data.length} guild commands`);
        logger.info('Commands are now available in your test server!');
        return;
      } catch (error: any) {
        if (error.code === 50001) {
          logger.warn('Bot is not in the specified guild or lacks access');
          logger.info('Falling back to global command deployment...');
        } else {
          throw error;
        }
      }
    }

    logger.info('Deploying commands globally (may take up to 1 hour to propagate)...');
    const data = await rest.put(
      Routes.applicationCommands(env.clientId!),
      { body: commands }
    ) as any[];

    logger.success(`Successfully reloaded ${data.length} global commands`);
    logger.warn('Global commands can take up to 1 hour to appear in all servers');
  } catch (error) {
    logger.error('Failed to deploy commands', error);
    process.exit(1);
  }
}

deployCommands();
