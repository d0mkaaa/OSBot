import { Client } from 'discord.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from './logger.js';

export class TempbanChecker {
  private client: Client;
  private interval: Timer | null = null;

  constructor(client: Client) {
    this.client = client;
  }

  public start() {
    this.interval = setInterval(() => this.checkExpiredBans(), 60000);
    logger.info('Tempban checker started');
  }

  public stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('Tempban checker stopped');
    }
  }

  private async checkExpiredBans() {
    const db = DatabaseManager.getInstance();
    const expiredBans = db.getExpiredTempbans() as Array<{
      guild_id: string;
      user_id: string;
      moderator_id: string;
      reason: string;
      expires_at: number;
    }>;

    for (const ban of expiredBans) {
      try {
        const guild = await this.client.guilds.fetch(ban.guild_id).catch(() => null);
        if (!guild) {
          logger.warn(`Guild ${ban.guild_id} not found for tempban expiry`);
          db.markTempbanAsUnbanned(ban.guild_id, ban.user_id);
          continue;
        }

        const bannedUser = await guild.bans.fetch(ban.user_id).catch(() => null);
        if (!bannedUser) {
          logger.info(`User ${ban.user_id} is not banned in ${guild.name}, marking tempban as complete`);
          db.markTempbanAsUnbanned(ban.guild_id, ban.user_id);
          continue;
        }

        await guild.bans.remove(ban.user_id, 'Temporary ban expired');
        db.markTempbanAsUnbanned(ban.guild_id, ban.user_id);

        logger.info(`Unbanned ${ban.user_id} from ${guild.name} (tempban expired)`);

        try {
          const user = await this.client.users.fetch(ban.user_id);
          await user.send({
            content: `Your temporary ban from **${guild.name}** has expired. You can now rejoin the server.`
          });
        } catch {
        }
      } catch (error) {
        logger.error(`Failed to process expired tempban for user ${ban.user_id} in guild ${ban.guild_id}`, error);
      }
    }
  }
}
