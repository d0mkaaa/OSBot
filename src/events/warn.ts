import { Events } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { logger } from '../utils/logger.js';

const event: BotEvent = {
  name: Events.Warn,

  async execute(warning: string): Promise<void> {
    logger.warn(`Discord client warning: ${warning}`);
  }
};

export default event;
