import { Message, MessageReaction, EmbedBuilder, TextChannel, User, PartialMessageReaction, PartialUser } from 'discord.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from './logger.js';

export class StarboardManager {
  private db: DatabaseManager;

  constructor() {
    this.db = DatabaseManager.getInstance();
  }

  public async handleReaction(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser, added: boolean): Promise<void> {
    try {
      if (reaction.partial) {
        await reaction.fetch();
      }
      if (user.partial) {
        await user.fetch();
      }

      if (reaction.emoji.name !== '⭐') return;

      const message = reaction.message as Message;
      if (!message.guild) return;

      if (message.author.id === user.id) {
        if (added) {
          await reaction.users.remove(user.id);
        }
        return;
      }

      const guildData = this.db.getGuild(message.guild.id) as any;
      if (!guildData?.starboard_channel_id) return;

      const starCount = reaction.count || 0;
      const threshold = guildData.starboard_threshold || 3;

      let entry = this.db.getStarboardEntry(message.guild.id, message.id) as any;

      if (starCount >= threshold) {
        if (!entry) {
          this.db.createStarboardEntry(message.guild.id, message.id, message.channel.id, message.author.id);
          entry = this.db.getStarboardEntry(message.guild.id, message.id) as any;
        }

        await this.updateStarboardMessage(message, starCount, guildData.starboard_channel_id, entry);
      } else if (entry && starCount < threshold) {
        await this.removeFromStarboard(message, entry);
      }
    } catch (error) {
      logger.error('Error handling starboard reaction', error);
    }
  }

  private async updateStarboardMessage(message: Message, starCount: number, starboardChannelId: string, entry: any): Promise<void> {
    try {
      const starboardChannel = await message.guild!.channels.fetch(starboardChannelId) as TextChannel;
      if (!starboardChannel?.isTextBased()) return;

      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setAuthor({
          name: message.author.tag,
          iconURL: message.author.displayAvatarURL()
        })
        .setDescription(message.content || '*No text content*')
        .addFields(
          { name: '⭐ Stars', value: starCount.toString(), inline: true },
          { name: '📝 Channel', value: `<#${message.channel.id}>`, inline: true },
          { name: '🔗 Jump', value: `[Jump to Message](${message.url})`, inline: true }
        )
        .setTimestamp(message.createdAt)
        .setFooter({ text: `Message ID: ${message.id}` });

      const attachment = message.attachments.first();
      if (attachment && attachment.contentType?.startsWith('image/')) {
        embed.setImage(attachment.url);
      }

      if (message.embeds.length > 0 && message.embeds[0].image) {
        embed.setImage(message.embeds[0].image.url);
      }

      if (entry.starboard_message_id) {
        try {
          const starboardMessage = await starboardChannel.messages.fetch(entry.starboard_message_id);
          await starboardMessage.edit({ embeds: [embed] });
          this.db.updateStarboardCount(message.guild!.id, message.id, starCount);
        } catch (error) {
          const newMessage = await starboardChannel.send({ embeds: [embed] });
          this.db.updateStarboardMessageId(message.guild!.id, message.id, newMessage.id);
          this.db.updateStarboardCount(message.guild!.id, message.id, starCount);
        }
      } else {
        const starboardMessage = await starboardChannel.send({ embeds: [embed] });
        this.db.updateStarboardMessageId(message.guild!.id, message.id, starboardMessage.id);
        this.db.updateStarboardCount(message.guild!.id, message.id, starCount);
      }
    } catch (error) {
      logger.error('Error updating starboard message', error);
    }
  }

  private async removeFromStarboard(message: Message, entry: any): Promise<void> {
    try {
      if (entry.starboard_message_id) {
        const guildData = this.db.getGuild(message.guild!.id) as any;
        if (guildData?.starboard_channel_id) {
          try {
            const starboardChannel = await message.guild!.channels.fetch(guildData.starboard_channel_id) as TextChannel;
            if (starboardChannel?.isTextBased()) {
              await starboardChannel.messages.delete(entry.starboard_message_id);
            }
          } catch (error) {
          }
        }
      }

      this.db.deleteStarboardEntry(message.guild!.id, entry.message_id);
    } catch (error) {
      logger.error('Error removing from starboard', error);
    }
  }
}

export const starboardManager = new StarboardManager();
