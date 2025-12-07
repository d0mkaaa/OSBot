import { Events, Message, PartialMessage, EmbedBuilder, TextChannel } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { DatabaseManager } from '../database/Database.js';

const event: BotEvent = {
  name: Events.MessageUpdate,

  async execute(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage): Promise<void> {
    if (!oldMessage.guild || !newMessage.guild) return;
    if (oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const db = DatabaseManager.getInstance();
    const guildData = db.getGuild(oldMessage.guild.id) as any;

    if (!guildData?.log_message_edits || !guildData?.log_channel_id) return;

    const logChannel = await oldMessage.guild.channels.fetch(guildData.log_channel_id).catch(() => null) as TextChannel | null;
    if (!logChannel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('📝 Message Edited')
      .setDescription(`Message edited in ${oldMessage.channel}`)
      .addFields(
        { name: '👤 Author', value: `${oldMessage.author} (${oldMessage.author?.id})`, inline: true },
        { name: '📍 Channel', value: `${oldMessage.channel}`, inline: true },
        { name: '🔗 Jump to Message', value: `[Click here](${newMessage.url})`, inline: true }
      )
      .setTimestamp();

    if (oldMessage.content) {
      embed.addFields({
        name: '📜 Before',
        value: oldMessage.content.slice(0, 1024) || '*No content*',
        inline: false
      });
    }

    if (newMessage.content) {
      embed.addFields({
        name: '📝 After',
        value: newMessage.content.slice(0, 1024) || '*No content*',
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
