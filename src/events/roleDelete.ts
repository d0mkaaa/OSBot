import { Events, Role, EmbedBuilder, TextChannel } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from '../utils/logger.js';

const event: BotEvent = {
  name: Events.GuildRoleDelete,

  async execute(role: Role): Promise<void> {
    const db = DatabaseManager.getInstance();
    const guildData = db.getGuild(role.guild.id) as any;

    if (!guildData?.log_role_events || !guildData?.log_channel_id) return;

    const logChannel = await role.guild.channels.fetch(guildData.log_channel_id).catch(() => null) as TextChannel | null;
    if (!logChannel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🗑️ Role Deleted')
      .addFields(
        { name: '🏷️ Role', value: role.name, inline: true },
        { name: '🆔 ID', value: role.id, inline: true },
        { name: '🎨 Color', value: role.hexColor, inline: true }
      )
      .setTimestamp();

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to send role delete log', error);
    }
  }
};

export default event;
