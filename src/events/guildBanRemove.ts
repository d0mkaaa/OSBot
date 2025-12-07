import { Events, GuildBan, EmbedBuilder, TextChannel } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from '../utils/logger.js';

const event: BotEvent = {
  name: Events.GuildBanRemove,

  async execute(ban: GuildBan): Promise<void> {
    const db = DatabaseManager.getInstance();
    const guildData = db.getGuild(ban.guild.id) as any;

    if (!guildData?.log_ban_events || !guildData?.log_channel_id) return;

    const logChannel = await ban.guild.channels.fetch(guildData.log_channel_id).catch(() => null) as TextChannel | null;
    if (!logChannel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Member Unbanned')
      .addFields(
        { name: '👤 User', value: `${ban.user.tag} (${ban.user.id})`, inline: true }
      )
      .setThumbnail(ban.user.displayAvatarURL())
      .setTimestamp();

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to send unban log', error);
    }
  }
};

export default event;
