import { Events, Message, PartialMessage, EmbedBuilder, TextChannel } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { snipeManager } from '../utils/snipe.js';
import { DatabaseManager } from '../database/Database.js';

const event: BotEvent = {
  name: Events.MessageDelete,

  async execute(message: Message | PartialMessage): Promise<void> {
    snipeManager.addSnipe(message);

    if (!message.guild || message.author?.bot) return;

    const db = DatabaseManager.getInstance();
    const guildData = db.getGuild(message.guild.id) as any;

    if (!guildData?.log_message_deletes || !guildData?.log_channel_id) return;

    const logChannel = await message.guild.channels.fetch(guildData.log_channel_id).catch(() => null) as TextChannel | null;
    if (!logChannel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🗑️ Message Deleted')
      .setDescription(`Message deleted in ${message.channel}`)
      .addFields(
        { name: '👤 Author', value: `${message.author} (${message.author?.id})`, inline: true },
        { name: '📍 Channel', value: `${message.channel}`, inline: true }
      )
      .setTimestamp();

    if (message.content) {
      embed.addFields({
        name: '📜 Content',
        value: message.content.slice(0, 1024) || '*No content*',
        inline: false
      });
    }

    if (message.attachments && message.attachments.size > 0) {
      const attachmentUrls = Array.from(message.attachments.values()).map(att => att.url).join('\n');
      embed.addFields({
        name: '📎 Attachments',
        value: attachmentUrls.slice(0, 1024),
        inline: false
      });
    }

    try {
      await logChannel.send({ embeds: [embed] });
    } catch {
    }
  }
};

export default event;
