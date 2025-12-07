import { Events, DMChannel, GuildChannel, EmbedBuilder, TextChannel, ChannelType } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from '../utils/logger.js';

const event: BotEvent = {
  name: Events.ChannelDelete,

  async execute(channel: DMChannel | GuildChannel): Promise<void> {
    if (!('guild' in channel) || !channel.guild) return;

    const db = DatabaseManager.getInstance();
    const guildData = db.getGuild(channel.guild.id) as any;

    if (!guildData?.log_channel_events || !guildData?.log_channel_id) return;

    const logChannel = await channel.guild.channels.fetch(guildData.log_channel_id).catch(() => null) as TextChannel | null;
    if (!logChannel?.isTextBased()) return;

    const channelTypes: Record<number, string> = {
      [ChannelType.GuildText]: 'Text Channel',
      [ChannelType.GuildVoice]: 'Voice Channel',
      [ChannelType.GuildCategory]: 'Category',
      [ChannelType.GuildAnnouncement]: 'Announcement Channel',
      [ChannelType.GuildStageVoice]: 'Stage Channel',
      [ChannelType.GuildForum]: 'Forum Channel'
    };

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🗑️ Channel Deleted')
      .addFields(
        { name: '📍 Channel', value: channel.name, inline: true },
        { name: '🏷️ Type', value: channelTypes[channel.type] || 'Unknown', inline: true },
        { name: '🆔 ID', value: channel.id, inline: true }
      )
      .setTimestamp();

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to send channel delete log', error);
    }
  }
};

export default event;
