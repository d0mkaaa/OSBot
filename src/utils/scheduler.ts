import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from './logger.js';

export class TaskScheduler {
  private client: Client;
  private db: DatabaseManager;
  private reminderInterval?: NodeJS.Timeout;
  private giveawayInterval?: NodeJS.Timeout;
  private pollInterval?: NodeJS.Timeout;

  constructor(client: Client) {
    this.client = client;
    this.db = DatabaseManager.getInstance();
  }

  public start(): void {
    this.reminderInterval = setInterval(() => this.checkReminders(), 2000);
    this.giveawayInterval = setInterval(() => this.checkGiveaways(), 2000);
    this.pollInterval = setInterval(() => this.checkPolls(), 2000);

    this.checkReminders();
    this.checkGiveaways();
    this.checkPolls();

    logger.info('Task scheduler started');
  }

  public stop(): void {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = undefined;
    }
    if (this.giveawayInterval) {
      clearInterval(this.giveawayInterval);
      this.giveawayInterval = undefined;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
    logger.info('Task scheduler stopped');
  }

  private async checkReminders(): Promise<void> {
    try {
      const reminders = this.db.getPendingReminders() as any[];

      for (const reminder of reminders) {
        try {
          this.db.completeReminder(reminder.id);

          const channel = await this.client.channels.fetch(reminder.channel_id);

          if (channel?.isTextBased()) {
            await (channel as TextChannel).send({
              content: `<@${reminder.user_id}> 🔔 **Reminder:** ${reminder.message}`
            });

            logger.info(`Completed reminder ${reminder.id} for user ${reminder.user_id}`);
          }
        } catch (error) {
          logger.error(`Failed to send reminder ${reminder.id}`, error);
        }
      }
    } catch (error) {
      logger.error('Error checking reminders', error);
    }
  }

  private async checkGiveaways(): Promise<void> {
    try {
      const giveaways = this.db.getPendingGiveaways() as any[];

      for (const giveaway of giveaways) {
        try {
          this.db.completeGiveaway(giveaway.id);

          if (!giveaway.message_id) {
            logger.warn(`Giveaway ${giveaway.id} has no message_id, already marked as completed`);
            continue;
          }

          const channel = await this.client.channels.fetch(giveaway.channel_id);

          if (!channel?.isTextBased()) {
            logger.warn(`Channel ${giveaway.channel_id} not found for giveaway ${giveaway.id}`);
            continue;
          }

          const message = await (channel as TextChannel).messages.fetch(giveaway.message_id);

          if (message.partial) {
            await message.fetch();
          }

          const reaction = message.reactions.cache.get('🎉');

          if (!reaction) {
            const embed = new EmbedBuilder()
              .setColor(0x808080)
              .setTitle('🎉 GIVEAWAY ENDED 🎉')
              .setDescription(
                `**Prize:** ${giveaway.prize}\n` +
                `**Winners:** No valid entries\n\n` +
                `Giveaway ended with no participants.`
              )
              .setFooter({ text: `Hosted by ${giveaway.created_by}` });

            await message.edit({ embeds: [embed] });
            continue;
          }

          const users = await reaction.users.fetch();
          logger.info(`Giveaway ${giveaway.id}: Found ${users.size} total reactions`);

          const participants = users.filter(user => !user.bot);
          logger.info(`Giveaway ${giveaway.id}: Found ${participants.size} non-bot participants`);

          if (participants.size === 0) {
            const embed = new EmbedBuilder()
              .setColor(0x808080)
              .setTitle('🎉 GIVEAWAY ENDED 🎉')
              .setDescription(
                `**Prize:** ${giveaway.prize}\n` +
                `**Winners:** No valid entries\n\n` +
                `Giveaway ended with no participants.`
              )
              .setFooter({ text: `Hosted by ${giveaway.created_by}` });

            await message.edit({ embeds: [embed] });
            continue;
          }

          const winnerCount = Math.min(giveaway.winner_count, participants.size);
          const winnerArray = participants.random(winnerCount);
          const winnerList = Array.isArray(winnerArray) ? winnerArray : [winnerArray];

          const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎉 GIVEAWAY ENDED 🎉')
            .setDescription(
              `**Prize:** ${giveaway.prize}\n` +
              `**Winner${winnerList.length > 1 ? 's' : ''}:** ${winnerList.map(w => w.toString()).join(', ')}\n\n` +
              `Congratulations! 🎊`
            )
            .setFooter({ text: `Hosted by ${giveaway.created_by}` });

          await message.edit({ embeds: [embed] });
          await message.reply(
            `🎉 Congratulations ${winnerList.map(w => w.toString()).join(', ')}! You won **${giveaway.prize}**!`
          );

          logger.info(`Completed giveaway ${giveaway.id} with ${winnerList.length} winner(s)`);
        } catch (error) {
          logger.error(`Failed to end giveaway ${giveaway.id}`, error);
        }
      }
    } catch (error) {
      logger.error('Error checking giveaways', error);
    }
  }

  private async checkPolls(): Promise<void> {
    try {
      const polls = this.db.getPendingPolls() as any[];

      for (const poll of polls) {
        try {
          this.db.completePoll(poll.id);

          if (!poll.message_id) {
            logger.warn(`Poll ${poll.id} has no message_id, already marked as completed`);
            continue;
          }

          const channel = await this.client.channels.fetch(poll.channel_id);

          if (!channel?.isTextBased()) {
            logger.warn(`Channel ${poll.channel_id} not found for poll ${poll.id}`);
            continue;
          }

          const message = await (channel as TextChannel).messages.fetch(poll.message_id);

          if (message.partial) {
            await message.fetch();
          }

          const options: string[] = JSON.parse(poll.options);
          const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
          const results: { option: string; count: number }[] = [];

          for (let i = 0; i < options.length; i++) {
            const reaction = message.reactions.cache.get(emojis[i]);
            const count = reaction ? reaction.count - 1 : 0;
            results.push({ option: options[i], count });
          }

          const totalVotes = results.reduce((sum, r) => sum + r.count, 0);
          const maxVotes = Math.max(...results.map(r => r.count));

          let resultsText = results.map((r, i) => {
            const percentage = totalVotes > 0 ? ((r.count / totalVotes) * 100).toFixed(1) : '0.0';
            const isWinner = r.count === maxVotes && r.count > 0;
            const bar = '█'.repeat(Math.floor((r.count / (maxVotes || 1)) * 15));
            const winner = isWinner ? ' 👑' : '';
            return `${emojis[i]} **${r.option}**${winner}\n${bar} ${r.count} votes (${percentage}%)`;
          }).join('\n\n');

          const resultsEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`📊 Poll Results: ${poll.question}`)
            .setDescription(resultsText)
            .addFields({ name: '📈 Total Votes', value: totalVotes.toString(), inline: true })
            .setFooter({ text: 'Poll has ended' })
            .setTimestamp();

          await message.edit({ embeds: [resultsEmbed] });

          logger.info(`Completed poll ${poll.id} with ${totalVotes} total votes`);
        } catch (error) {
          logger.error(`Failed to end poll ${poll.id}`, error);
        }
      }
    } catch (error) {
      logger.error('Error checking polls', error);
    }
  }
}
