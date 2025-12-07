import { Events } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { logger } from '../utils/logger.js';

const event: BotEvent = {
  name: Events.Error,

  async execute(error: Error): Promise<void> {
    logger.error('Discord client error occurred', error);
  }
};

export default event;
