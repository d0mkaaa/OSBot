import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BotClient, Command } from '../types/index.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadCommandsFromDirectory(client: BotClient, directory: string): Promise<void> {
  const entries = readdirSync(directory);

  for (const entry of entries) {
    const entryPath = join(directory, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) {
      await loadCommandsFromDirectory(client, entryPath);
    } else if (entry.endsWith('.ts') || entry.endsWith('.js')) {
      const commandModule = await import(entryPath);
      const command: Command = commandModule.default;

      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        logger.info(`Loaded command: ${command.data.name}`);
      } else {
        logger.warn(`Command at ${entry} is missing required "data" or "execute" property`);
      }
    }
  }
}

export async function loadCommands(client: BotClient): Promise<void> {
  const commandsPath = join(__dirname, '..', 'commands');
  await loadCommandsFromDirectory(client, commandsPath);
  logger.success(`Loaded ${client.commands.size} commands`);
}
