import { Events, ActivityType } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { TaskScheduler } from '../utils/scheduler.js';

const event: BotEvent = {
  name: Events.ClientReady,
  once: true,

  async execute(client: any): Promise<void> {
    logger.success(`Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);

    client.user.setPresence({
      activities: [{
        name: '/help',
        type: ActivityType.Listening
      }],
      status: 'online'
    });

    const scheduler = new TaskScheduler(client);
    scheduler.start();

    client.scheduler = scheduler;
  }
};

export default event;
