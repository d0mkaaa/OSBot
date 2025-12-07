import { Events, DMChannel, GuildChannel, EmbedBuilder, TextChannel } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from '../utils/logger.js';

const event: BotEvent = {
  name: Events.ChannelUpdate,

  async execute(oldChannel: DMChannel | GuildChannel, newChannel: DMChannel | GuildChannel): Promise<void> {
    if (!('guild' in newChannel) || !newChannel.guild) return;

    const db = DatabaseManager.getInstance();
    const guildData = db.getGuild(newChannel.guild.id) as any;

    if (!guildData?.log_channel_events || !guildData?.log_channel_id) return;

    const logChannel = await newChannel.guild.channels.fetch(guildData.log_channel_id).catch(() => null) as TextChannel | null;
    if (!logChannel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('✏️ Channel Updated')
      .addFields({ name: '📍 Channel', value: `${newChannel}`, inline: false })
      .setTimestamp();

    let hasChanges = false;

    if ('name' in oldChannel && 'name' in newChannel && oldChannel.name !== newChannel.name) {
      embed.addFields({
        name: '📝 Name Changed',
        value: `${oldChannel.name} → ${newChannel.name}`,
        inline: false
      });
      hasChanges = true;
    }

    if ('topic' in oldChannel && 'topic' in newChannel && oldChannel.topic !== newChannel.topic) {
      embed.addFields({
        name: '📋 Topic Changed',
        value: `Before: ${oldChannel.topic || 'None'}\nAfter: ${newChannel.topic || 'None'}`.slice(0, 1024),
        inline: false
      });
      hasChanges = true;
    }

    if ('nsfw' in oldChannel && 'nsfw' in newChannel && oldChannel.nsfw !== newChannel.nsfw) {
      embed.addFields({
        name: '🔞 NSFW Status',
        value: newChannel.nsfw ? 'Enabled' : 'Disabled',
        inline: true
      });
      hasChanges = true;
    }

    if ('rateLimitPerUser' in oldChannel && 'rateLimitPerUser' in newChannel && oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
      embed.addFields({
        name: '⏱️ Slowmode',
        value: newChannel.rateLimitPerUser ? `${newChannel.rateLimitPerUser} seconds` : 'Disabled',
        inline: true
      });
      hasChanges = true;
    }

    if (!hasChanges) return;

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to send channel update log', error);
    }
  }
};

export default event;
